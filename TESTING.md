# Testing Guide

## Quick Start

```bash
source venv/bin/activate
pytest
```

## Common Commands

```bash
pytest -v                          # Verbose output
pytest -m "not slow"               # Skip slow tests
pytest -k "yolo11n"                # Test specific model
pytest tests/test_models.py::TestModelInference  # Test specific class
```

## Troubleshooting

**Models not found:**
```bash
python scripts/export_models.py
```

**Import errors:**
```bash
pip install -r requirements.txt
```
