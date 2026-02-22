import cv2
import os

# Load the pre-trained face and eye classifiers
# Note: You need to have these .xml files in the same directory or provide the full path.
# You can download them from the OpenCV GitHub repository.
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Capture video from webcam
cap = cv2.VideoCapture(0)

print("Starting Human Face Detector...")
print("Press 'ESC' to exit.")

while True:
    # Read frame
    ret, img = cap.read()
    if not ret:
        print("Failed to capture image")
        break
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    
    for (x, y, w, h) in faces:
        # Draw rectangle around face (Yellow-ish/Cyan in OpenCV is BGR)
        cv2.rectangle(img, (x, y), (x + w, y + h), (255, 255, 0), 2)
        cv2.putText(img, "FACE", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)
        
        # Detect eyes in face region
        roi_gray = gray[y:y + h, x:x + w]
        roi_color = img[y:y + h, x:x + w]
        eyes = eye_cascade.detectMultiScale(roi_gray)
        for (ex, ey, ew, eh) in eyes:
            cv2.rectangle(roi_color, (ex, ey), (ex + ew, ey + eh), (0, 127, 255), 2)
            cv2.putText(roi_color, "EYE", (ex, ey - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 127, 255), 1)
    
    # Display
    cv2.imshow('Human Face Detector (Python)', img)
    
    # Exit on ESC key
    if cv2.waitKey(30) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
print("Detector closed.")
