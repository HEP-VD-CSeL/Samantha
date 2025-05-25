from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from ultralytics import RTDETR, FastSAM
import cv2
import torch
import numpy as np
from PIL import Image
import asyncio
import uvicorn
import json
import base64
import gc

print("Starting AI worker...")
app = FastAPI()

# device selection
device = (
  'cuda' if torch.cuda.is_available()
  else 'mps' if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()
  else 'cpu'
)
print(f"Device detected: {device}")

display_opencv = False

async def detect(ws, workspace, file, classes):
  # models path
  rt_detr_l_path = f'{workspace}/models/rt-detr-l.pt'
  rt_detr_l_face_path = f'{workspace}/models/rt-detr-x-face.pt'

  # Object detection model
  model_object = RTDETR(rt_detr_l_path)
  model_object.to(device)
  # face detection model
  model_face = RTDETR(rt_detr_l_face_path)
  model_face.to(device)
  # ByteTrack config file from ultralytics
  tracker_cfg = 'bytetrack.yaml' 

  # video loop
  cap = cv2.VideoCapture(file)
  if not cap.isOpened():
    print("Error opening video file")
    exit()

  # holds every detection for every frame
  detections_per_frame = []

  while True:
    ok, frame = cap.read()
    if not ok:
      break

    # hold every detection for this frame
    frame_detections = []

    # run the detection models asynchronously
    results_face = asyncio.to_thread(model_face.track, frame, persist=True, conf=0.1, iou=0.3, tracker=tracker_cfg)
    results = asyncio.to_thread(model_object.track, frame, persist=True, conf=0.1, iou=0.3, tracker=tracker_cfg)


    # Face detection + tracking
    #results_face = model_face.track(frame, persist=True, conf=0.1, iou=0.3, tracker=tracker_cfg)
    results_face = await results_face
    boxes_face = results_face[0].boxes
    if boxes_face is not None:
      for xyxy, conf, cls, tid in zip(boxes_face.xyxy.cpu().numpy(), boxes_face.conf.cpu().numpy(), boxes_face.cls.cpu().numpy(),(boxes_face.id.cpu().numpy() if boxes_face.id is not None else [-1]*len(boxes_face))):
        x1, y1, x2, y2 = map(int, xyxy)
        detection = {
          "id": int(tid),
          "classid": -1, # we set the classid to -1 for face detection
          "classname": "face",  
          "positions": { "x1": x1, "y1": y1, "x2": x2, "y2": y2}
        }
        frame_detections.append(detection)
    
    # objects detection + tracking
    #results = model_object.track(frame, persist=True, conf=0.1, iou=0.3, tracker=tracker_cfg)
    results = await results 
    boxes = results[0].boxes   # ultralytics Results object
    if boxes is not None:
      # xyxy, confidence, class, track_id are all tensors; move to CPU & numpy
      for xyxy, conf, cls, tid in zip(boxes.xyxy.cpu().numpy(), boxes.conf.cpu().numpy(), boxes.cls.cpu().numpy(), (boxes.id.cpu().numpy() if boxes.id is not None else [-1]*len(boxes))):
        x1,y1,x2,y2 = map(int, xyxy)
        detection = {
          "id": int(tid),
          "classid": int(cls),
          "classname": model_object.names[int(cls)],
          "positions": { "x1": x1, "y1": y1, "x2": x2, "y2": y2}
        }
        frame_detections.append(detection)

    # Append current frame detections to the list
    detections_per_frame.append(frame_detections)
    for detection in frame_detections:
      # do not draw classes not in the selected list
      if classes is not None and detection['classid'] not in classes:
        continue 

      det = detection["positions"]
      label = f"{detection['classname']} {detection['id']}"
      color = (0, 255, 0)
      cv2.rectangle(frame, (det["x1"], det["y1"]), (det["x2"], det["y2"]), color, 2)
      cv2.putText(frame, label, (det["x1"], det["y1"]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    if display_opencv:
      cv2.imshow('RT-DETR + ByteTrack', frame)

    # send image to client
    await ws.send_text(base64.b64encode(cv2.imencode('.jpg', frame)[1]).decode('utf-8'))
    
    if cv2.waitKey(1) == 27:   # ESC
      break

  cap.release()
  cv2.destroyAllWindows()
  cv2.waitKey(1)
  del model_object
  del model_face
  gc.collect()
  if torch.cuda.is_available():
    torch.cuda.empty_cache()
  if torch.backends.mps.is_available():
    torch.mps.empty_cache()
  print("Detection done.")

  return detections_per_frame

def get_image(image):
    if isinstance(image, Image.Image):
        img = np.array(image)
    elif isinstance(image, np.ndarray):
        img = image.copy()
    else:
        raise Exception("Input image should be either PIL Image or numpy array!")

    if img.ndim == 3:
        img = np.transpose(img, (2, 0, 1))  # chw
    elif img.ndim == 2:
        img = img[np.newaxis, ...]

    assert img.ndim == 3

    img = img.astype(np.float32) / 255
    return img


def ceil_modulo(x, mod):
    if x % mod == 0:
        return x
    return (x // mod + 1) * mod


def scale_image(img, factor, interpolation=cv2.INTER_AREA):
    if img.shape[0] == 1:
        img = img[0]
    else:
        img = np.transpose(img, (1, 2, 0))

    img = cv2.resize(img, dsize=None, fx=factor, fy=factor, interpolation=interpolation)

    if img.ndim == 2:
        img = img[None, ...]
    else:
        img = np.transpose(img, (2, 0, 1))
    return img

def pad_img_to_modulo(img, mod):
    channels, height, width = img.shape
    out_height = ceil_modulo(height, mod)
    out_width = ceil_modulo(width, mod)
    return np.pad(
        img,
        ((0, 0), (0, out_height - height), (0, out_width - width)),
        mode="symmetric",
    )

def prepare_img_and_mask(image, mask, device, pad_out_to_modulo=8, scale_factor=None):
    out_image = get_image(image)
    out_mask = get_image(mask)

    if scale_factor is not None:
        out_image = scale_image(out_image, scale_factor)
        out_mask = scale_image(out_mask, scale_factor, interpolation=cv2.INTER_NEAREST)

    if pad_out_to_modulo is not None and pad_out_to_modulo > 1:
        out_image = pad_img_to_modulo(out_image, pad_out_to_modulo)
        out_mask = pad_img_to_modulo(out_mask, pad_out_to_modulo)

    out_image = torch.from_numpy(out_image).unsqueeze(0).to(device)
    out_mask = torch.from_numpy(out_mask).unsqueeze(0).to(device)

    out_mask = (out_mask > 0) * 1

    return out_image, out_mask

async def anonymize(ws, workspace, file, detections_list):
  # video loop
  cap = cv2.VideoCapture(file)
  if not cap.isOpened():
    print("Error opening video file")
    exit()

  fast_sam = FastSAM(f'{workspace}/models/FastSAM-x.pt')
  fast_sam.to(device)
  # inpainting model
  model_inpainting = torch.jit.load(f'{workspace}/models/big-lama.pt', map_location=device)
  model_inpainting.eval()
  model_inpainting.to(device)

  while True:
    ok, frame = cap.read()
    if not ok:
      break

    # send clear image to client
    await ws.send_text(base64.b64encode(cv2.imencode('.jpg', frame)[1]).decode('utf-8'))
    
    # run FastSAM on every detection
    detections = detections_list.pop(0)
    for detection in detections:
      if detection['blur'] or detection['inpaint']:
          
        # Get bounding box
        x1, y1, x2, y2 = map(int, [
          detection['positions']['x1'],
          detection['positions']['y1'], 
          detection['positions']['x2'], 
          detection['positions']['y2']]
        )

        # Run FastSAM with bbox prompt on the full frame
        # results = fast_sam(frame, bboxes=[x1, y1, x2, y2], device=device, conf=0.0, iou=0.9)
        results = await asyncio.to_thread(fast_sam, frame, bboxes=[x1, y1, x2, y2], device=device, conf=0.0, iou=0.9)
        if isinstance(results, list):
              results = results[0]
        if results.masks is None:
              continue

        # Get the mask as a numpy array (shape: [num_masks, h, w])
        masks_np = results.masks.data.cpu().numpy()
        if masks_np.shape[0] == 0:
            continue
        mask = masks_np[0]  # Use the first mask

        # Resize mask to frame size if needed
        if mask.shape != frame.shape[:2]:
          mask = cv2.resize(mask, (frame.shape[1], frame.shape[0]), interpolation=cv2.INTER_NEAREST)

        # we skip the blur for now
        # Elegant blur anonymization
        mask_bool = mask > 0.1  # Use a reasonable threshold
        blurred = cv2.GaussianBlur(frame, (81, 81), 0)
        frame[mask_bool] = blurred[mask_bool]

        """
        # Make the mask binary and dilate for stronger anonymization
        mask_bin = (mask > 0.1).astype(np.uint8) * 255
        kernel = np.ones((21, 21), np.uint8)  # You can increase for more coverage
        mask_bin = cv2.dilate(mask_bin, kernel, iterations=1)

        # Convert frame and mask to PIL Images
        frame_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        mask_pil = Image.fromarray(mask_bin)

        # Prepare tensors for LaMa
        img_tensor, mask_tensor = prepare_img_and_mask(frame_pil, mask_pil, device)

        with torch.inference_mode():
            inpainted = model_inpainting(img_tensor, mask_tensor)
            inpainted_np = inpainted[0].permute(1, 2, 0).detach().cpu().numpy()
            inpainted_np = np.clip(inpainted_np * 255, 0, 255).astype(np.uint8)

        inpainted_bgr = cv2.cvtColor(inpainted_np, cv2.COLOR_RGB2BGR)
        frame[mask_bin > 0] = inpainted_bgr[mask_bin > 0]
        """
        """
        # draw the bounding box
        color = (0, 255, 0) if not detection.get('blur', False) else (0, 0, 255)  # Green for normal, Red for blurred
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label = f"{detection['classname']} {detection['id']}"
        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        """

        # send image to client
        await ws.send_text(base64.b64encode(cv2.imencode('.jpg', frame)[1]).decode('utf-8'))
    if display_opencv:
      cv2.imshow('RT-DETR + ByteTrack', frame)
    
    

    if cv2.waitKey(1) == 27:   # ESC
      break

  cap.release()
  cv2.destroyAllWindows()
  cv2.waitKey(1)
  del fast_sam
  del model_inpainting
  gc.collect()
  if torch.cuda.is_available():
    torch.cuda.empty_cache()
  if torch.backends.mps.is_available(): 
    torch.mps.empty_cache()
  print("Anonymization.")

# endpoint for object detection
@app.websocket("/detect")
async def detect_endpoint(ws: WebSocket):
  await ws.accept()
  print("Detection ws connection established.")

  try:
    # Receive the first message with context informations
    data = await ws.receive_text()
    data = json.loads(data)
    print("Received data:", data)

    workspace = data.get("workspace")
    file = data.get("file")
    classes = data.get("classes")

    detections_per_frame = await detect(ws=ws, workspace=workspace, file=file, classes=classes) 
    
    print("Detection finished.")
    await ws.send_text(json.dumps({ "status": "done", "detections": detections_per_frame }))
    
    await ws.close()
  except WebSocketDisconnect as e:
    print(f"WebSocket disconnected, stopping detection: {e}")
  except Exception as e:
    print("Detection error:", e)
    await ws.close()

# endpoint for object detection
@app.websocket("/anonymize")
async def detect_endpoint(ws: WebSocket):
  await ws.accept()
  print("Anonymization ws connection established.")

  try:
    # Receive the first message with context informations
    data = await ws.receive_text()
    data = json.loads(data)

    workspace = data.get("workspace")
    file = data.get("file")
    detections = data.get("detections")

    # Call the anonymization function
    await anonymize(ws=ws, workspace=workspace, file=file, detections_list=detections)
    print("Anonymization finished.")

    await ws.close()
  except WebSocketDisconnect as e:
    print(f"WebSocket disconnected, stopping detection: {e}")
  except Exception as e:
    print("Anonymization error:", e)
    await ws.close()

if __name__ == "__main__": 
  uvicorn.run("main:app", host="0.0.0.0", port=3000, ws_ping_interval=1, ws_ping_timeout=300)
