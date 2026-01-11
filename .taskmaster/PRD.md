# Project Specification: Real-Time Object Detection with YOLO11 and ONNX Runtime Web

## Overview and Objectives

This project aims to build a real-time object detection web application using the latest Ultralytics YOLOv11 model and ONNX Runtime Web for in-browser inference. The application will run entirely on the client-side (desktop browsers), processing live webcam video to detect objects without any server, thus providing instant results and preserving privacy.

### Objectives:

- Strengthen practical skills in machine learning (specifically computer vision) by integrating a state-of-the-art YOLO model.
- Gain experience with ONNX model deployment in web environments using WebAssembly/WebGPU.
- Build a Next.js front-end with modern UI components (shadcn/UI + TailwindCSS) for an interactive user interface.
- Implement the full pipeline: video capture, image preprocessing, model inference, post-processing (including Non-Maximum Suppression (NMS)), and visualization of detection results.

By completing this project, you will learn how to convert and use a pretrained YOLO model in the browser, handle real-time video processing, and optimize performance for a smooth user experience in a web app.

## Key Features and Requirements

The application will include the following key features (from the project description):

- **Live Webcam Object Detection**: Capture video from the user's webcam and perform object detection on each frame in real-time.
- **Multi-Output YOLO Model**: Utilize YOLOv11's outputs (bounding box coordinates, class predictions, confidence scores) for each detected object.
- **Bounding Box Visualization**: Draw rectangles around detected objects on the video with label names and confidence percentages.
- **Non-Maximum Suppression (NMS)**: Apply NMS to filter overlapping boxes, ensuring only the best detections are shown. (Implement either via algorithm or via ONNX model, discussed later.)
- **Anchor Box Handling & Coordinate Transformation**: Account for YOLO's internal use of anchor boxes / grids and convert model outputs (center-x, center-y, width, height) into proper pixel coordinates on the original video frame. This involves scaling and translating coordinates if images are resized or padded.
- **FPS Counter & Performance Metrics**: Display the inference frame rate (frames per second) and possibly latency or model inference time to monitor performance.
- **Multiple Model Size Support**: Allow switching between different YOLOv11 model sizes (e.g., Nano n, Small s, Medium m) to trade off accuracy vs. speed. For example, YOLO11-N (2.6M params) for higher FPS vs YOLO11-M (20M params) for better accuracy.
- **Custom Object Filtering**: Provide UI controls to filter detections by class – e.g. the user can choose to only display people or cars, etc. The system should hide or ignore other classes based on the selection.
- **Screenshot and Recording**: Ability to capture a snapshot of the current video frame (with boxes overlaid) and download it. Also, allow recording a short video clip of the detection output (by capturing the canvas frames) to a video file.
- **Ultralytics YOLOv11 (latest version)**: Use the newest YOLO model (v11) from Ultralytics, benefiting from its improved accuracy and efficiency. The model will be used in pretrained form (e.g., trained on COCO dataset) for general object classes, unless a custom model is provided.

All processing must happen client-side in the browser, leveraging ONNX Runtime Web and WebAssembly/WebGPU for acceleration. The app will target desktop browsers (Chrome, Edge, etc.), where sufficient CPU and optional WebGPU support is available. No mobile optimization is required for now.

## Technology Stack

To fulfill the above requirements, the project will utilize the following technologies and tools:

- **Ultralytics YOLOv11 Model**: The latest YOLO detector model for object detection. YOLOv11 offers enhanced architecture (improved backbone and neck), higher accuracy with fewer parameters (e.g., YOLO11-medium achieves higher mAP with 22% fewer parameters than YOLOv8m), and improved speed (up to 25% lower latency than YOLOv10). We will use the official Ultralytics pretrained weights (e.g., yolo11n.pt, yolo11s.pt, etc.) and convert them to ONNX. YOLOv11 supports a variety of tasks (detection, segmentation, pose, etc.), but our focus is on object detection with bounding boxes.

- **ONNX Runtime Web**: A JavaScript/WASM library to run ONNX format models in the browser. ONNX (Open Neural Network Exchange) is an open format to represent ML models, and ONNX Runtime is a high-performance engine to execute them on various platforms. We will use onnxruntime-web to load the YOLOv11 ONNX model and perform inference in the client. By using ONNX Runtime Web with WebAssembly (and optionally WebGPU), we avoid any server and achieve cross-platform compatibility.

- **Next.js (React framework)**: We will create the front-end using Next.js (latest version with the App Router, if compatible with our tools). Next.js provides a convenient React environment with support for modern features. We will build a single-page interface (or a main page) that contains the video/canvas and control panel. Next.js also allows easily bundling the WASM and model assets.

- **shadcn/UI (React + Tailwind CSS components)**: For rapid UI development, we will use shadcn/UI, which provides pre-built, accessible React components styled with Tailwind CSS and Radix UI primitives. This will help create a clean, modern interface (buttons, toggles, dropdowns, etc.) for controlling the demo (such as switching models, toggling class filters, etc.) with minimal custom CSS.

- **OpenCV.js (optional for preprocessing)**: We can use the OpenCV.js library (the WebAssembly build of OpenCV) for image preprocessing tasks. OpenCV.js can handle resizing, padding (letterboxing), color space conversion, and normalization in the browser, just like we would in Python. This helps prepare frames for the YOLO model input exactly as required (e.g., performing letterbox resize with black borders, converting RGBA to BGR, scaling pixel values). Using OpenCV.js ensures we follow the same preprocessing as Ultralytics (improving accuracy of detections). Alternatively, we could implement preprocessing manually with Canvas API and simple JS computations, but OpenCV.js offers a robust solution.

- **Web APIs for Video & Canvas**: We will use standard browser APIs for:
  - Camera access via `MediaDevices.getUserMedia()` to get a webcam video stream.
  - HTML5 `<video>` element to display the live feed (or we may render video frames to a canvas directly).
  - HTML5 `<canvas>` element for drawing the bounding boxes and also as a means to capture video frames for processing (using `canvas.getContext('2d')` to draw video frames and retrieve pixel data).
  - `MediaRecorder` API for recording canvas stream to a video file (WebM) if implementing the recording feature.

- **TypeScript**: The project will be written in TypeScript for type safety, especially since ONNX runtime and other libraries provide type definitions that help catch errors. Next.js + TS will make development more robust.

### Why these choices?

This stack ensures that everything runs locally in-browser:

- ONNX + WASM allows ML inference without native libraries or server, with near-native speed in JavaScript.
- Next.js and shadcn UI enable a responsive, user-friendly interface.
- Using Ultralytics YOLOv11 ensures we leverage a state-of-the-art model that is both accurate and optimized for speed, which is crucial for real-time applications.

## System Architecture and Workflow

Before diving into implementation details, it's important to understand the high-level flow of the application. The system can be broken down into several stages:

1. **Model Preparation** (offline step): Convert the YOLOv11 PyTorch model to ONNX format.
2. **Initialization** (on page load): Load the ONNX model(s) into the browser using ONNX Runtime, and set up video capture.
3. **Live Video Capture**: Continuously capture frames from the webcam video stream.
4. **Preprocessing**: For each frame, preprocess the image (resize, pad, normalize) to the format expected by YOLOv11.
5. **Inference**: Run the YOLOv11 ONNX model on the preprocessed frame (using `InferenceSession.run()` from onnxruntime-web) to get raw detection outputs.
6. **Post-processing (NMS and Filtering)**: Take the raw outputs (which include many candidate boxes with scores) and apply Non-Maximum Suppression to remove redundant overlaps. Filter out low-confidence detections and any classes the user chose to hide.
7. **Coordinate Transformation**: Transform the remaining bounding box coordinates back to the original video frame dimensions (undoing any resizing/padding done in preprocessing).
8. **Visualization**: Draw the final bounding boxes and labels onto a canvas overlay (or directly on the video frame). Update the FPS counter.
9. **User Interaction**: Throughout the process, the user can change settings (e.g., select a different model size, toggle class filters) which should immediately reflect in the detection logic, and use buttons for snapshot or recording as needed.

All these steps happen in a loop for each video frame (or at a controlled interval). The system will likely use an async loop or `requestAnimationFrame` to process frames one after another, ensuring we don't start processing a new frame until the previous inference is complete (to avoid accumulating latency).

Below, we specify each component of this pipeline in detail.

## Preparing the YOLOv11 ONNX Model

### Model Conversion

We will use the Ultralytics Python library to export the YOLOv11 model to ONNX format. Ultralytics provides a simple API for this. For example, to export the nano model:

```python
from ultralytics import YOLO
model = YOLO("yolo11n.pt")  # load pretrained YOLOv11 nano
model.export(format="onnx")  # creates 'yolo11n.onnx' in the working directory
```

This will convert the YOLOv11 PyTorch model into an ONNX file. We need to ensure the export uses parameters suitable for web inference:

- **Input size (imgsz)**: We'll typically use the default 640x640 pixels. We can explicitly set `imgsz=640` if needed, or a tuple if a non-square or different size is preferred.

- **Dynamic input shapes**: Setting `dynamic=True` during export allows the ONNX model to accept different image sizes. However, for simplicity and performance we may stick to a fixed 640x640 input (since variable shapes can hinder optimization). Alternatively, dynamic shape could be useful if we let the model accept the actual video resolution without forcing a resize.

- **Opset version**: Use `opset=12` for broader WebGPU compatibility (as noted in a similar project). ONNX opset 12 is sufficient for YOLOv8/11 and ensures the WebAssembly and WebGPU backends support all needed ops.

- **Include NMS or not**: By default, `model.export(format="onnx")` does not include NMS in the ONNX graph (the `nms` argument defaults to `False`). We will keep it that way and handle NMS ourselves in the browser. Including NMS in the model could simplify post-processing, but it's not recommended for our case because:
  - The ONNX NMS op from PyTorch may not be supported by onnxruntime-web's WASM backend.
  - Doing NMS in JS allows dynamic tuning of the IoU/score thresholds at runtime.
  - If using YOLOv11 specifically, note that Ultralytics can embed NMS and even other post-processing in the ONNX if `nms=True` (and for tasks like segmentation, they embed mask processing). But for learning purposes, we want to implement the NMS logic manually (or via a small separate ONNX model) to better understand it.

- **Half precision**: We might export in FP16 (`half=True`) to reduce model size and speed up inference. But WebAssembly may not benefit from FP16 (it might upcast to FP32), and WebGPU might support it. Initially, we can use full FP32 for maximum compatibility, and later consider FP16 if performance needs tuning.

After exporting, we'll have e.g. `yolo11n.onnx` (~some tens of MB depending on model size). We will include this file in our Next.js app (perhaps in the `public/` directory so it can be fetched via an URL, or maybe loaded as a static asset). For multiple model support, we will export the small (n), medium (m), etc., or download the ready ONNX from Ultralytics if available.

**Note**: Ultralytics YOLO models (v8, v9, v10, v11…) are typically licensed under AGPL-3.0 for the official weights. Since we are using pretrained models, we must ensure compliance (AGPL requires making source available if we distribute an application using the model). For personal skill-building this is not an issue, but if this project is deployed publicly, licensing should be considered.

## Next.js Front-End Architecture

We will structure the front-end as a Next.js application using the App Router. The UI will consist of a single page that contains two main parts: the video/canvas display area and the control panel.

### Layout

Using shadcn/UI and Tailwind, we can create a responsive layout. For desktop, we can have the video/canvas taking up the majority of space, and a sidebar or overlay for controls. Since mobile is not targeted, we can assume a reasonably large screen and possibly fixed elements.

#### Video/Canvas Area

This will contain either:
- A `<video>` element showing the live webcam feed (for user reference), with an HTML `<canvas>` overlay on top (positioned absolutely) where we draw bounding boxes and labels. This approach leverages the browser's optimized video rendering, and we just draw the overlay separately.
- Or, we might use a single canvas to draw both the video frame and the boxes each time (updating every frame). This second approach gives more control for capturing frames and recording, but it means we handle rendering the video manually. A hybrid is possible: use the video element for display, but use an off-screen canvas for processing frames.

We will likely use the video element for display and an offscreen canvas for capturing frames to feed the model (see Video Capture below). The on-screen canvas will be for drawing results. Canvas drawing will use 2D context (`canvas.getContext('2d')`) to draw rectangles, text, etc., for each detection.

#### Control Panel

UI components to control the application:

- **Model Selector**: A dropdown (select) to choose which YOLO model variant to use (e.g., "YOLOv11-N (fastest)", "YOLOv11-M (accurate)"). Selecting one will load the corresponding ONNX model (if not already loaded) and use it for subsequent inferences.

- **Class Filters**: Possibly a dropdown multi-select or a list of checkboxes (one per common class) to include/exclude classes. If using COCO 80 classes, listing all might be overwhelming; instead, we could have a text input to filter class names, or a few example toggles (person, car, etc.). For simplicity, we might include a preset list of key classes (person, car, bus, bicycle, etc.) to toggle, and treat others as a single group. The filtering logic will simply ignore detections whose class is not checked.

- **Threshold Sliders**: Optionally, sliders or number inputs for confidence threshold and NMS IoU threshold. For example, confidence threshold (score) default 0.25, NMS IoU threshold default 0.45 as typical for YOLO. Adjusting these will affect the post-processing on the fly.

- **Buttons**:
  - "Start/Stop Detection" (if we allow pausing the inference loop).
  - "Screenshot" to capture the current annotated frame. This will trigger a function that converts the current canvas to an image (using `canvas.toBlob()` or `toDataURL` and then download).
  - "Record Video" toggle: When activated, start recording the canvas stream via `canvas.captureStream()` and `MediaRecorder`. When deactivated (stop), finalize the recording and provide a download link for the user.

- **Performance Display**: We will show the current FPS (updated every second or so). Also possibly show the resolution being used (e.g., 640x640 model input) and maybe the model name loaded.

We will use shadcn/UI components to implement these controls, ensuring a consistent and accessible design. For example, a nice `<Switch>` component for toggles, a styled `<Select>` for model pick, etc., as provided by shadcn/UI library.

### State Management

We can use React state (or context) to store current settings (selected model, thresholds, filter toggles). The detection loop can refer to this state on each iteration. We must ensure updates (like changing model or thresholds) are handled safely (e.g., if a new model is selected, we need to load it and swap the inference session).

### Multithreading Consideration

If needed, heavy processing (like the ONNX inference) could be offloaded to a Web Worker to keep the UI responsive. ONNX Runtime Web's WASM does support multi-threading (if enabled) and will utilize Web Workers internally for parallelism. We likely can run the inference in the main thread since onnxruntime-web by default spawns threads for its execution if allowed. But to avoid blocking any UI rendering, we will carefully use `async/await` around the `session.run()` calls.

## Live Video Capture (Webcam Integration)

For live video input, we use the Web Media API:

- **Request camera access**: `navigator.mediaDevices.getUserMedia({ video: true })`. This returns a Promise for a MediaStream. We will handle permission requests (the browser will prompt the user).
- **On success**, we set the video stream to a `<video>` element: `video.srcObject = stream`. We also call `video.play()` to start the video. We might hide the native video controls and play automatically (with user permission).
- We ensure the video element has attributes like `playsInline` (to allow inline playback on mobile, though not needed for desktop specifically) and is not muted (for camera, there's no audio unless we request it).
- The video element's dimensions (`videoWidth`, `videoHeight`) will match the camera feed resolution (e.g., 1280x720 or whatever the default camera res is). We can use those or adjust constraints when requesting (to possibly lower the resolution for speed – e.g., request 640x480 to reduce processing cost).
- We will listen for the `loadeddata` or `playing` event on the video element to know when it's ready to start processing frames.
- We then set up a loop to capture frames. A simple approach:
  - Use an off-screen canvas (not visible to user, or the same canvas we draw on, but better separate) and its 2D context.
  - In a loop (possibly using `requestAnimationFrame` or a `setInterval` timed at ~30 FPS), do `context.drawImage(video, 0, 0, width, height)` to draw the current video frame to the canvas.
  - Then, `context.getImageData(0, 0, width, height)` can retrieve pixel data. However, we might not need to manually get ImageData if we use OpenCV.js or directly create an ONNX Tensor from the canvas.

Since we plan to use OpenCV.js for preprocessing, there is a convenience: OpenCV.js has `cv.imread()` which can read from an HTML element. If it can directly read from a `<video>` element, that would be ideal. Typically, `cv.imread()` is used with `<img>` or `<canvas>`. We can always grab a frame to an offscreen canvas and then let OpenCV read from that canvas element. Alternatively, convert the video frame to an `<img>` by drawing it to canvas and converting to data URI (less efficient). The canvas approach is fine.

### Frame Loop Control

We should be mindful not to overwhelm the system. If the model is slow (e.g., large model), processing every single 60 FPS frame is impossible. We might process at a lower rate. A common pattern is:

```javascript
async function inferenceLoop() {
   if (!running) return;
   // capture frame to canvas
   // preprocess, run model, draw results
   // compute timing for FPS
   requestAnimationFrame(inferenceLoop);
}
```

However, if inference is async, using `requestAnimationFrame` alone might queue multiple calls. Instead, we can do something like:

```javascript
video.onplay = () => {
   running = true;
   loop();
};
async function loop() {
   if (!running) return;
   const start = performance.now();
   // draw frame, run model...
   const end = performance.now();
   // update FPS using (1/(end-start))
   // call next loop on next animation frame
   requestAnimationFrame(loop);
}
```

Alternatively, use `setTimeout(loop, 0)` at the end of the async function to effectively run back-to-back but ensuring the previous iteration finished.

For simplicity, we will start processing once the video is playing and keep processing until the user stops or navigates away.

## Image Preprocessing Pipeline

To achieve accurate detections, we must preprocess each video frame in the same way the YOLO model expects. YOLO models typically require:

- A specific input size (e.g., 640x640 pixels).
- 3-channel image in BGR color format.
- Normalized pixel values (either 0-1 or -1 to 1 depending on training; for Ultralytics YOLO, they use 0-1 normalization by dividing by 255).
- Often, images are letterboxed: resized to fit the model's input shape while maintaining aspect ratio, padding the rest with a constant color (usually black).

We will implement the following steps, closely matching Ultralytics' preprocessing:

### 1. Read Frame into Matrix

If using OpenCV.js, convert the canvas image into a `cv.Mat`. For example:

```javascript
const mat = cv.imread(canvasElement); // reads from canvas
```

This gives us an OpenCV matrix with shape (frameHeight, frameWidth, 4) presumably (it might include the alpha channel from the canvas). We then convert to 3-channel BGR:

```javascript
const matC3 = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC3);
cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR);
mat.delete();
```

Now `matC3` is the image in BGR color space.

### 2. Letterbox (Padding)

We want to resize the image to a square of size 640x640 (assuming that is the model input) without distortion. This means scaling the image until it fits in the 640x640 box in one dimension and padding the remaining area with black. We can compute:

- `maxSize = max(matC3.rows, matC3.cols)` – the larger of width or height.
- If the image is already square, no padding needed (maxSize = both).
- Otherwise, pad the shorter dimension. For instance, if width < height, pad width to make it equal height; if height < width, pad height.

In OpenCV:

```javascript
const maxSize = Math.max(matC3.rows, matC3.cols);
const yPad = maxSize - matC3.rows;
const xPad = maxSize - matC3.cols;
const matPad = new cv.Mat();
cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT, new cv.Scalar(0,0,0));
```

This will create a `matPad` of size (maxSize x maxSize) with the original image in the top-left and black padding on the right or bottom as needed. We pad only on the bottom or right to keep things simple (the choice of padding distribution (top/bottom split, etc., is not critical as long as we know how we did it for coordinate transform).

Calculate scaling ratios for later:

```javascript
const xRatio = maxSize / matC3.cols;
const yRatio = maxSize / matC3.rows;
```

These ratios represent how much the original image was scaled to reach the padded square dimension. Actually, since we did not resize yet (we only padded), at this stage either xRatio or yRatio is 1 and the other ≥1. However, in the next step we will resize matPad to (640x640), effectively scaling the image by (640/maxSize). We can combine these steps or do separately.

### 3. Resize to Model Input

Now take the padded square matPad and resize to the model's input resolution, e.g., 640x640:

```javascript
const modelWidth = 640, modelHeight = 640;
cv.resize(matPad, matPad, new cv.Size(modelWidth, modelHeight));
```

Alternatively, OpenCV.js provides a convenience `cv.blobFromImage` that can do resizing and normalization in one call:

```javascript
const inputBlob = cv.blobFromImage(
    matPad,
    1/255.0,                        // scale factor to normalize 0-255 to 0-1
    new cv.Size(modelWidth, modelHeight),
    new cv.Scalar(0, 0, 0),         // mean subtraction (none, just use 0)
    true,                           // swapRB (since we converted to BGR, but if blobFromImage defaults to RGB, this flag might swap back to RGB; need to confirm usage)
    false                           // do not crop
);
```

This gives a 4-dimensional blob: shape [1, 3, modelHeight, modelWidth] with float32 values. It has already normalized the pixel values by 1/255.

If we use `blobFromImage`, it handles resizing internally. If not, we would manually do `cv.resize` then divide pixel values by 255. The result is the input tensor for our model.

### 4. Cleanup

We should free any temporary Mats we created to avoid memory leaks in OpenCV.js:

```javascript
matC3.delete();
// mat was already deleted
// matPad we'll keep for a moment until blob is done
// Actually blobFromImage returns a Mat as well.
matPad.delete();
```

If `blobFromImage` was used, it returns a Mat of type CV_32F (floats). We then need to get its data to feed into ONNX. We can use `inputBlob.data32F` to get a Float32Array of the blob's data.

### 5. Output

The preprocessing function will output:
- The tensor data for the model (a Float32Array of shape [1,3,640,640]).
- The scaling ratios (xRatio, yRatio) and perhaps the padding info, which we'll need to map output coordinates back. In our method, since we padded to square and then scaled to 640, we can use a combined ratio to original:
  - Actually, easier: track the ratio of original->scaled used:
    - `scale = modelWidth / maxSize` is the scale factor from original padded size to model size.
  - If original width < original height:
    - original height * scale = modelHeight, original width * scale = some smaller number (the width in the model image).
  - The xRatio, yRatio from earlier can be combined with scale if needed, but we can also store:
    - `xScale = modelWidth / matC3.cols`
    - `yScale = modelHeight / matC3.rows`

These represent how each original dimension was scaled overall. Actually, since matPad made both dims = maxSize then scaled equally, xScale = yScale = modelWidth / maxSize. But handling separately is fine too.

In the PyImageSearch example, they returned [inputBlob, xRatio, yRatio] where xRatio = maxSize/origWidth, yRatio = maxSize/origHeight. Then when drawing results, they used those to upscale coordinates. We will follow a similar approach.

### Summary

By the end of preprocessing, we have a tensor ready for YOLO and the factors needed to convert output boxes back to the original image dimensions. All of this is done client-side with WebAssembly, which should be fast enough (OpenCV.js processing a 640x480 image to 640x640 blob in a few milliseconds typically).

If not using OpenCV.js, an alternative is:
- Use canvas to draw video frame scaled to 640x some, then manually pad pixels, etc. But that is reimplementing a lot. OpenCV is preferred for correctness and simplicity.

## ONNX Model Inference in the Browser

With the input tensor prepared, we can run the model using ONNX Runtime Web. The steps include loading the model, setting up the runtime session, then performing inference calls:

### Model Loading

We will load the ONNX model file via fetch or directly using the onnxruntime-web API:

```javascript
import * as ort from 'onnxruntime-web';
// ...
const modelURL = "/models/yolo11n.onnx";  // if placed in public/models
const session = await ort.InferenceSession.create(modelURL);
```

This uses the WASM backend by default. Optionally, we can enable WebGL or WebGPU:

- `ort.env.wasm.numThreads = 4;` (for example, to allow multi-threading in WASM if supported).
- `ort.env.wasm.simd = true; ort.env.wasm.proxy = true;` (to use SIMD and proxy multi-threading).
- There is also an onnxruntime-web "GPU" package that can use WebGL/WebGPU. We might integrate that if available (e.g., `InferenceSession.create(modelURL, { executionProviders: ['webgl'] })`). However, WebGPU is experimental but promises faster execution. According to a similar project, enabling WebGPU in a Chromium browser via flags can drastically improve performance. We can detect if `ort.env.webgpu` is available and set it.
- We'll implement logic to try WebGPU -> fall back to WASM. The nomi30701 project suggests the app will auto-fallback to WASM if WebGPU is not available. We can rely on onnxruntime's internal fallback or code our own check.

We also load the NMS model (if using a separate ONNX for NMS, see next section) similarly:

```javascript
const nmsSession = await ort.InferenceSession.create("nms.onnx");
```

But we might implement NMS in JS instead of loading a model, which would avoid needing a second session.

### Running Inference

Once the session is ready and we have a preprocessed input tensor:

```javascript
const feeds = { images: new ort.Tensor('float32', inputBlob.data32F, [1, 3, 640, 640]) };  // assume model input name is 'images'
const results = await session.run(feeds);
```

Ultralytics ONNX models usually have outputs named like `output0` or similar. We need to check the model's outputs. If NMS is not included, the model likely outputs a single tensor of shape [1, num_boxes, 6+num_classes] or similar (for detection). For example, YOLOv8 ONNX gives an output of shape [1,8400,85] for an 640x640 input (with 80 classes), where each 85-element vector is [x, y, w, h, objectness, class0_prob, class1_prob, ...]. YOLOv11 might be similar, or it might output separate arrays for boxes and scores. We will inspect the model or documentation.

According to the inference lifecycle description, YOLO's raw outputs include bounding box coordinates (cx, cy, w, h), an objectness score, and class probabilities. Likely the output tensor is of shape [1, N, 85] (if 80 classes). We will get it via `results[outputName]`.

For example:

```javascript
const outputData = results['output0'].data;  // Float32Array
```

We will reshape it or iterate through it in the next step.

### Performance

Running the model on a 640x640 image in WASM might take e.g. 50-100ms on a decent CPU for YOLOv11-n (just estimating), which is ~10-20 FPS, possibly. Using WebGL/GPU could improve that. We will measure and adjust (maybe use YOLO-nano to ensure real-time FPS > 15). We also ensure that heavy computation is asynchronous (the `session.run` is awaited, not blocking the UI thread in a synchronous way).

We also note that ONNX Runtime Web executes entirely within the browser with no data leaving the client, which aligns with privacy requirements.

## Post-Processing: NMS and Filtering Detections

After obtaining the raw predictions from the YOLO model, we must perform Non-Maximum Suppression (NMS) and thresholding to finalize the detection boxes. YOLO networks produce multiple overlapping boxes for the same object (especially across different anchor grids and scales). NMS filters these to one box per object by removing lower-confidence overlaps.

### Parsing Model Output

First, we need to interpret the model output tensor:

- Suppose we have an output array of shape [1, M, K] (M = number of predictions, K = number of values per prediction). We iterate over each of the M predictions:
  - Extract the first 4 values as cx, cy, w, h.
  - The fifth value as objectness score (confidence that some object is present in the box).
  - The remaining values correspond to class probabilities (or confidence for each class).
  - We can compute a combined score per class by multiplying objectness with class probability for each class (this is how YOLO outputs are often interpreted). Alternatively, Ultralytics might output already the product. We find the class with the highest score.
  - So for each prediction, determine `class_id = argmax(class_probs)`, and `score = objectness * class_probs[class_id]`. If this score is below our confidence threshold (e.g. 0.25), we discard that prediction immediately.
  - Also disregard any boxes with nonsensical dimensions (e.g., width or height <= 0 after conversion, though ideally none should be negative).

Now we have a list of candidate detections: each with `(class_id, score, cx, cy, w, h)`.

### Apply Non-Maximum Suppression (NMS)

NMS algorithm implementation:

- Group predictions by class or do all together? Standard YOLO NMS typically operates class-wise (so that overlapping boxes of different classes aren't suppressed against each other). We can perform NMS per class:
  - For each class c:
    - Filter the list to only detections of class c.
    - Sort these detections by their confidence score, descending.
    - Iterate through the sorted list, and for each detection d, compare it with all detections after it in the list. If the IoU (Intersection over Union) of d with any other detection d2 is above the IoU threshold (e.g., 0.45) and d2 has not been suppressed yet, then remove d2 from the list (suppress it).
    - Continue until all remaining have no high overlaps.
  - The result is a pruned list of boxes for each class. Combine them back to one list.

#### Calculating IoU

Given two boxes (in absolute coords: x1,y1,x2,y2), IoU = area(intersection) / area(union). We will convert (cx,cy,w,h) to (x1,y1,x2,y2) when computing IoU. That conversion:
- `x1 = cx - w/2`
- `y1 = cy - h/2`
- `x2 = cx + w/2`
- `y2 = cy + h/2`

We must be careful that the coordinates we use for IoU are all in the same scale (at this point, if we haven't converted to original image yet, we can do IoU in the normalized/model scale – that's fine for comparing overlap, since the relative areas are same). It might be simpler to do NMS in the model coordinate system (0 to 640 scale) before scaling to original. The IoU outcome is the same regardless of absolute scale.

#### Alternate approach: Use a pre-built ONNX model for NMS

- The PyImageSearch tutorial chose to use a small ONNX model that takes the YOLO outputs and does NMS (likely using ONNX's NonMaxSuppression op internally). This model would output the indices of selected boxes. The advantage is that it's in WASM as well, but the disadvantage is complexity of handling two models and less flexibility.
- Also, since YOLOv11 ONNX export can include NMS now, it's optional. For learning, implementing NMS in JS is instructive, so we'll proceed with manual NMS.

### Class Filtering

After NMS, we have a final list of detections. We then apply the user's class filter settings: simply remove any detection whose `class_id` is not in the allowed set. For example, if the user only wants "person" and "car", we drop all other classes. The class names (labels) for COCO can be stored in a JSON or array (Ultralytics provides a list of 80 class names for COCO). We will likely have that list in our code (or load it from a file) and use `class_id` to map to a label string for display.

## Coordinate Transformation (Scaling Boxes to Original Image)

The boxes output by the model are relative to the scaled input image (640x640 with padding). We need to map them onto the original video frame coordinates (which could be, say, 1280x720, etc., or whatever the camera resolution is).

### Approach

A robust solution is to track the padding explicitly:

```javascript
const scale = Math.min(modelWidth/originalWidth, modelHeight/originalHeight);
const scaledW = originalWidth * scale;
const scaledH = originalHeight * scale;
const padX = modelWidth - scaledW;  // total padding in width (all on right)
const padY = modelHeight - scaledH; // total padding in height (all on bottom)
```

For each detection (assuming cx,cy,w,h are relative to the 640 space):

```javascript
let x = cx - w/2;
let y = cy - h/2;
let x2 = cx + w/2;
let y2 = cy + h/2;

// Clamp within valid content area
x = Math.max(0, x);
y = Math.max(0, y);
x2 = Math.min(scaledW, x2);
y2 = Math.min(scaledH, y2);

// Map to original coordinates
const orig_x = x / scale;
const orig_y = y / scale;
const orig_w = (x2 - x) / scale;
const orig_h = (y2 - y) / scale;
```

This yields the box in original pixel units for drawing on the original video frame.

### Result

Each final detection box now has coordinates relative to the original video frame pixels. We also map class IDs to class names (e.g., 0 -> "person", etc.) for labeling.

## Rendering and Visualization

With final detection results (boxes + labels + scores), we proceed to render them on the output canvas that the user sees:

### Canvas Setup

- Set up a canvas element of the same size as the video element (e.g., if video is 1280x720, canvas width=1280, height=720). We can overlay it via CSS or use absolute positioning.
- The canvas should be cleared each frame (before drawing new boxes): `ctx.clearRect(0, 0, canvas.width, canvas.height)`.

### Drawing Bounding Boxes

For each detection, draw a rectangle using the 2D canvas context:

```javascript
ctx.strokeStyle = "#00FF00"; // for example, green
ctx.lineWidth = 2;
ctx.strokeRect(orig_x, orig_y, orig_w, orig_h);
```

This outlines the bounding box. We might use different colors for different classes if desired (e.g., person boxes blue, vehicle boxes red, etc., or randomly per class).

### Drawing Labels

Compose a text like "person: 92%" and draw it:

- Set `ctx.font = "16px sans-serif"` (adjust size based on video resolution).
- Set `ctx.fillStyle = "#00FF00"` (matching the box color) and optionally use `ctx.strokeText()` with black stroke for an outline effect for readability.
- Position the text at the top-left of the box. If that is too high (near top edge), place it below the box instead.
- Optionally, draw a semi-transparent background behind text for readability using `ctx.measureText()` and drawing a filled rectangle.

### FPS Display

Overlay the FPS in a corner of the canvas:

```javascript
ctx.fillStyle = "#FFFF00"; // yellow
ctx.fillText("FPS: 18", 10, 20);
```

Compute FPS as: `fps = 1000 / (currentFrameTime - lastFrameTime)`, possibly smoothed with a moving average.

### Screenshot and Recording

- **Screenshot**: Maintain a second canvas that composites the video frame and boxes using `ctx.drawImage(video, ...)` then `ctx.drawImage(overlayCanvas, ...)`, then use `canvas.toBlob()` to download.
- **Video Recording**: Use a single-canvas rendering approach where each loop iteration draws the incoming video frame and the detection results on a canvas. The user sees the canvas (which updates in realtime). Use `MediaRecorder` on `canvas.captureStream()` to record.
- Set `canvas.width = video.videoWidth` and `canvas.height = video.videoHeight` after the video stream is loaded to match the video resolution.

## Performance Considerations

Achieving real-time performance (i.e., at least 15-30 FPS) is crucial. Several strategies and considerations:

### Model Size

- The app will default to **YOLOv11 Nano (YOLO11-N)** for real-time processing, especially on CPU. YOLO11-N has only ~2.6 million parameters and is optimized for speed, making it suitable for live webcam applications.
- In contrast, larger models (YOLO11-L or X) would be too slow in the browser.
- We provide the option to switch to YOLO11-M (20M params) or S (9M params) for higher accuracy, but warn that FPS will drop.
- According to Ultralytics, YOLO11-N can achieve ~1.55 ms latency on some hardware (likely GPU) vs larger models 6-11 ms – relative difference suggests YOLO-N is significantly faster.

### WebAssembly Optimizations

- Enable SIMD and multi-threading in ONNX Runtime Web if possible. This can substantially boost throughput on capable browsers.
- Consider using the **WebGPU** execution provider. With Chrome's experimental WebGPU (after enabling the "Unsafe WebGPU" flag), onnxruntime-web can utilize the GPU for tensor computations.
- This could improve inference times dramatically (reports show YOLO models running much faster via WebGPU than pure WASM).
- Our app will attempt to use WebGPU and fall back gracefully to WASM if unavailable.

### Frame Rate Throttling

- If the processing cannot keep up with the camera's frame rate, we effectively process every nth frame.
- This will naturally happen if our loop is slower than 16ms (60 FPS); the video will just continue but we only sample frames when ready.
- Use `requestAnimationFrame` which will drop frames if busy, or have logic to skip a frame if last processing is still ongoing.

### Other Optimizations

- **Parallelizing**: Handle one frame at a time to ensure minimal lag. The output may always be a frame or two behind live, but not more.
- **Canvas drawing performance**: Drawing rectangles and text is trivial relative to model inference. Modern browsers handle 720p canvas operations easily at 30 FPS with 2D context, especially with GPU acceleration for `drawImage`.
- **Memory management**: Clean up OpenCV Mat objects promptly to avoid memory bloat in WASM heap. Reuse objects where possible (e.g., allocate the tensor array once and update its data rather than allocate new every frame).
- **Future improvements**: Consider quantized models (INT8) for faster CPU inference, or use a smaller input size than 640 if high FPS is needed more than accuracy (e.g., 320x320 model input).

## Summary and Next Steps

This specification outlined the design of a real-time object detection web app using YOLOv11 and ONNX Runtime Web. We covered the end-to-end pipeline: from preparing the model, capturing video, preprocessing frames, running inference in-browser, applying NMS, to visualizing results with an interactive UI. By implementing this project, one will gain hands-on experience with deploying advanced deep learning models in a web environment and learn about the optimizations needed for real-time performance.

### Next Steps

1. Set up the Next.js project and integrate the required libraries (onnxruntime-web, OpenCV.js, shadcn UI components, etc.).
2. Perform the YOLOv11 ONNX export and include the model files.
3. Implement the described modules (video capture, preprocessing function, inference loop, NMS utility, drawing routine), testing each in isolation.
4. Tune the performance by experimenting with different model sizes and execution providers (WASM vs WebGL/WebGPU) and verify the FPS on a typical desktop.
5. Finally, polish the UI (make it user-friendly, add instructions or status messages as needed, e.g., "Loading model…" indicator when switching models, etc.).

By following this spec, the resulting application will allow users to open a webpage, enable their webcam, and see live detections (e.g., boxes around people, cars, etc.) with decent speed, all running locally in the browser. This project not only demonstrates computer vision capabilities but also serves as a stepping stone to more advanced web-based ML applications.

## References

- **Ultralytics YOLOv11 documentation** – overview of YOLOv11 improvements in accuracy and efficiency and model performance comparisons.
- **Ultralytics export guide** – how to convert YOLO models to ONNX using `model.export()` and available export options (e.g., NMS inclusion).
- **PyImageSearch tutorial on running YOLO in browser** – described the end-to-end browser inference pipeline and reasons for handling NMS separately in JavaScript. Also provided approach for preprocessing with OpenCV.js (resizing, padding, normalization) and mapping outputs back to original image using stored ratios.
- **GitHub project yolo-object-detection-onnxruntime-web** – confirmed model sizes and recommended use cases (YOLO11-N for real-time) and notes on enabling WebGPU for performance with fallback to WASM.
- **Dev.to article on video object detection** – explained capturing video frames to canvas for processing. This approach is applied for grabbing frames for our inference loop.
- **ONNX Runtime documentation** – general reference for running ONNX models in WebAssembly and available optimizations.