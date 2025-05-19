from ultralytics import RTDETR
import cv2, torch

# device selection
device = (
  'cuda' if torch.cuda.is_available()
  else 'mps' if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()
  else 'cpu'
)
print(f"Device detected: {device}")

# paths
rt_detr_x_path = '/Users/marcel/Desktop/samantha/models/rt-detr-l.pt'
rt_detr_x_face_path = '/Users/marcel/Desktop/samantha/models/rt-detr-x-face.pt'
video_path     = '/Users/marcel/Desktop/samantha/projects/test/base.mp4'

# Object detection model
model_object = RTDETR(rt_detr_x_path)
model_object.to(device)
# face detection model
model_face = RTDETR(rt_detr_x_face_path)
model_face.to(device)
# ByteTrack config file from ultralytics
tracker_cfg = 'bytetrack.yaml' 

# video loop
cap = cv2.VideoCapture(video_path)
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

  # objects detection + tracking
  results = model_object.track(frame, persist=True, conf=0.4, iou=0.3, tracker=tracker_cfg)
  boxes = results[0].boxes   # ultralytics Results object
  if boxes is not None:
    # xyxy, confidence, class, track_id are all tensors; move to CPU & numpy
    for xyxy, conf, cls, tid in zip(boxes.xyxy.cpu().numpy(), boxes.conf.cpu().numpy(), boxes.cls.cpu().numpy(), (boxes.id.cpu().numpy() if boxes.id is not None else [-1]*len(boxes))):
      x1,y1,x2,y2 = map(int, xyxy)
      detection = {
        "id": int(tid),
        "classid": int(cls),
        "classname": model_object.names[int(cls)],
        "positions": [x1, y1, x2, y2],
      }
      frame_detections.append(detection)

  # Face detection + tracking
  results_face = model_face.track(frame, persist=True, conf=0.5, iou=0.3, tracker=tracker_cfg)
  boxes_face = results_face[0].boxes
  if boxes_face is not None:
    for xyxy, conf, cls, tid in zip(boxes_face.xyxy.cpu().numpy(), boxes_face.conf.cpu().numpy(), boxes_face.cls.cpu().numpy(),(boxes_face.id.cpu().numpy() if boxes_face.id is not None else [-1]*len(boxes_face))):
      x1, y1, x2, y2 = map(int, xyxy)
      detection = {
        "id": int(tid),
        "classid": -1, # we set the classid to -1 for face detection
        "classname": "face",  
        "positions": [x1, y1, x2, y2],
      }
      frame_detections.append(detection)

  # Append current frame detections to the list
  detections_per_frame.append(frame_detections)
  for detection in frame_detections:
    x1, y1, x2, y2 = detection["positions"]
    label = f"{detection['classid']} {detection['classname']} => {detection['id']}"
    color = (0, 255, 0)
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)


  cv2.imshow('RT-DETR + ByteTrack', frame)
  if cv2.waitKey(1) == 27:   # ESC
    break

cap.release()
cv2.destroyAllWindows()
print("Done.")


