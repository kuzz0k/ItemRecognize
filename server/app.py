import base64
import cv2
import numpy as np
import torch
import eventlet
from flask import Flask
from flask_socketio import SocketIO

eventlet.monkey_patch()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

model = torch.hub.load("ultralytics/yolov5", "yolov5s", pretrained=True)
model.conf = 0.3

@socketio.on("send_frame")
def handle_frame(data):
    try:
        image_data = data.split(",")[1]  
        image_bytes = base64.b64decode(image_data)

        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            print("[SERVER] Error: Couldn't decode image")
            return

        results = model(frame)
        detections = results.pandas().xyxy[0]

        for _, row in detections.iterrows():
            x1, y1, x2, y2, conf, cls = int(row["xmin"]), int(row["ymin"]), int(row["xmax"]), int(row["ymax"]), row["confidence"], row["name"]
            label = f"{cls} {conf:.2f}"
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        _, buffer = cv2.imencode(".jpg", frame)
        encoded_image = base64.b64encode(buffer).decode("utf-8")

        socketio.emit("receive_frame", f"data:image/jpeg;base64,{encoded_image}")

    except Exception as e:
        print(f"[SERVER] Error processing image: {e}")

if __name__ == "__main__":
    print("[SERVER] WebSocket Server is running on ws://localhost:5000")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
