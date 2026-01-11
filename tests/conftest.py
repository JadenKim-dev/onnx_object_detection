"""
Pytest configuration and fixtures for ONNX model tests.
"""

import json
from pathlib import Path
import pytest
import numpy as np


@pytest.fixture(scope="session")
def project_root():
    """Get project root directory."""
    return Path(__file__).parent.parent


@pytest.fixture(scope="session")
def models_dir(project_root):
    """Get models directory path."""
    return project_root / "public" / "models"


@pytest.fixture(scope="session")
def data_dir(project_root):
    """Get data directory path."""
    return project_root / "public" / "data"


@pytest.fixture(scope="session", params=["yolo11n.onnx", "yolo11s.onnx", "yolo11m.onnx"])
def model_path(request, models_dir):
    """Parametrized fixture for all ONNX model paths."""
    return models_dir / request.param


@pytest.fixture(scope="session")
def model_paths(models_dir):
    """Get all ONNX model paths."""
    return {
        "yolo11n": models_dir / "yolo11n.onnx",
        "yolo11s": models_dir / "yolo11s.onnx",
        "yolo11m": models_dir / "yolo11m.onnx",
    }


@pytest.fixture(scope="session")
def models_metadata(data_dir):
    """Load models.json metadata."""
    with open(data_dir / "models.json", "r") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def coco_classes(data_dir):
    """Load COCO classes metadata."""
    with open(data_dir / "coco_classes.json", "r") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def onnx_session(model_path):
    """Create ONNX Runtime inference session."""
    import onnxruntime as ort
    return ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])


@pytest.fixture
def dummy_image():
    """Create dummy image input for inference testing."""
    return np.random.randn(1, 3, 640, 640).astype(np.float32)


@pytest.fixture(scope="session")
def expected_config():
    """Expected model configuration."""
    return {
        "opset": 12,
        "input_shape": [1, 3, 640, 640],
        "output_shape": [1, 84, 8400],
        "input_name": "images",
        "output_name": "output0",
    }


@pytest.fixture(scope="session")
def model_specs():
    """Specifications for each model variant."""
    return {
        "yolo11n": {
            "display_name": "YOLOv11 Nano",
            "parameters": "2.6M",
            "min_size_mb": 8,
            "max_size_mb": 12,
        },
        "yolo11s": {
            "display_name": "YOLOv11 Small",
            "parameters": "9.4M",
            "min_size_mb": 30,
            "max_size_mb": 40,
        },
        "yolo11m": {
            "display_name": "YOLOv11 Medium",
            "parameters": "20.1M",
            "min_size_mb": 70,
            "max_size_mb": 85,
        },
    }
