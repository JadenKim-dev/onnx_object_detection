# ONNX Object Detection

A Next.js application for object detection using ONNX models.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

### Export Models

Export YOLOv11 models to ONNX format (requires Python virtual environment):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/export_models.py
```

This exports YOLOv11n, YOLOv11s, and YOLOv11m models to `public/models/` and generates metadata files in `public/data/`.

## Testing

Run the test suite for exported ONNX models:

```bash
# Run all tests
pytest

# Run with verbose output
pytest tests/test_models.py -v

# Skip slow performance tests
pytest -m "not slow"
```

**Note:** Ensure models are exported before running tests.
