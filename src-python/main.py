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
rt_detr_x_path = '/Users/marcel/Desktop/samantha/models/rt-detr-x.pt'
video_path     = '/Users/marcel/Desktop/samantha/projects/test/base.mp4'

# model & tracker
model = RTDETR(rt_detr_x_path)
model.to(device)
tracker_cfg = 'bytetrack.yaml' # ByteTrack config file from ultralytics

# video loop
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
  print("Error opening video file")
  exit()

while True:
  ok, frame = cap.read()
  if not ok:
    break

  # ===== DETECTION + TRACKING in one call =====
  results = model.track(frame, persist=True, conf=0.5, iou=0.3, tracker=tracker_cfg)
  boxes = results[0].boxes   # ultralytics Results object
  if boxes is not None:
    # xyxy, confidence, class, track_id are all tensors; move to CPU & numpy
    for xyxy, conf, cls, tid in zip(boxes.xyxy.cpu().numpy(), boxes.conf.cpu().numpy(), boxes.cls.cpu().numpy(), (boxes.id.cpu().numpy() if boxes.id is not None else [-1]*len(boxes))):
      x1,y1,x2,y2 = map(int, xyxy)
      label = f"ID {int(tid)} {model.names[int(cls)]} {conf:.2f}"
      cv2.rectangle(frame, (x1,y1), (x2,y2), (0,255,0), 2)
      cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 2)

  cv2.imshow('RT-DETR + ByteTrack', frame)
  if cv2.waitKey(1) == 27:   # ESC
    break

cap.release()
cv2.destroyAllWindows()
print("Done.")




"""
from ultralytics import RTDETR
import cv2
import torch
import numpy as np


if torch.cuda.is_available():
  device = 'cuda'
  print("CUDA GPU detected. Using CUDA.")
elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
  device = 'mps'
  print("Apple Silicon GPU detected. Using MPS.")
else:
  print("CPU inference detected.")
  device = 'cpu'

rt_detr_x_path = '/Users/marcel/Desktop/samantha/models/rt-detr-x.pt'
video_path = '/Users/marcel/Desktop/samantha/projects/test/base.mp4'

# load the RTDETR model
model = RTDETR(rt_detr_x_path)
model.to(device)

# try to load the video
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
  print("Error opening video file")
  exit()

# read the video frame by frame
while True:
  ret, frame = cap.read()
  if not ret:
    break

  # detect objects in the frame and draw bounding boxes for all detections
  results = model(frame)
  for det in results[0].boxes.data.cpu().numpy():
    x1, y1, x2, y2, conf, cls = det
    #if cls > 0:
    #  continue
    if conf < 0.5:
      continue
    class_name = model.names[int(cls)] if hasattr(model, 'names') else str(int(cls))
    label = f"{int(cls)} {class_name} {conf:.2f}"
    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0,255,0), 2)
    cv2.putText(frame, label, (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 2)

  cv2.imshow('Video', frame)
  key = cv2.waitKey(1) 
  if key == 27: 
    break

cap.release()
cv2.destroyAllWindows()

print(f"Done.")

"""
