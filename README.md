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

### Python Tests (ONNX Models)

Test exported ONNX models:

```bash
pytest                          # Run all tests
pytest tests/test_models.py -v  # Verbose output
pytest -m "not slow"            # Skip performance tests
```

**Note:** Ensure models are exported before running tests.

### Frontend Tests (Vitest)

Test React components and utilities:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # UI interface
npm run test:coverage # Coverage report
```
