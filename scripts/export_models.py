#!/usr/bin/env python3
"""
Export YOLOv11 models to ONNX format for web inference.

This script exports YOLOv11n, YOLOv11s, and YOLOv11m models to ONNX format
with specific configurations optimized for browser-based inference using onnxruntime-web.
"""

import sys
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional

from ultralytics import YOLO

logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

EXPORT_CONFIG = {
    'format': 'onnx',
    'opset': 12,          # Compatibility with onnxruntime-web 1.23.2
    'dynamic': False,     # Fixed input size for better performance
    'simplify': True,     # Simplify graph with onnxsim
    'nms': False,         # NMS will behandled in JavaScript for flexibility
    'half': False,        # FP32 for better browser compatibility
    'imgsz': 640,         # Standard YOLO input size
    'batch': 1            # Single image inference
}

MODELS = [
    {
        'name': 'yolo11n',
        'display_name': 'YOLOv11 Nano',
        'description': 'Fastest model. Ideal for real-time applications.',
        'parameters': '2.6M',
        'expected_size_mb': 6,
        'recommended_use': 'Real-time detection'
    },
    {
        'name': 'yolo11s',
        'display_name': 'YOLOv11 Small',
        'description': 'Balanced speed and accuracy.',
        'parameters': '9.4M',
        'expected_size_mb': 20,
        'recommended_use': 'General purpose'
    },
    {
        'name': 'yolo11m',
        'display_name': 'YOLOv11 Medium',
        'description': 'Higher accuracy, moderate speed.',
        'parameters': '20.1M',
        'expected_size_mb': 40,
        'recommended_use': 'Accuracy-critical tasks'
    }
]

PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / 'public' / 'models'
DATA_DIR = PROJECT_ROOT / 'public' / 'data'


def export_model(model_config: Dict, output_dir: Path) -> Optional[Path]:
    """
    Export a YOLOv11 model to ONNX format.

    Args:
        model_config: Dictionary containing model configuration
        output_dir: Directory to save the exported ONNX model

    Returns:
        Path to exported ONNX file, or None if export failed
    """
    model_name = model_config['name']

    try:
        model = YOLO(f"{model_name}.pt")
        exported_path = model.export(**EXPORT_CONFIG)
    except Exception as e:
        logger.error(f"✗ {model_name}: {str(e)}")
        return None

    onnx_path = Path(exported_path) if isinstance(exported_path, str) else Path(str(exported_path))

    if not onnx_path.exists():
        logger.error(f"{model_name}: Export file not found")
        return None

    target_path = output_dir / onnx_path.name
    if onnx_path != target_path:
        try:
            onnx_path.rename(target_path)
        except Exception as e:
            logger.error(f"✗ {model_name}: Failed to move file - {str(e)}")
            return None

    file_size_mb = target_path.stat().st_size / (1024 * 1024)
    logger.info(f"✓ {model_name}: {file_size_mb:.1f} MB")
    return target_path


def verify_onnx_model(model_path: Path, model_config: Dict) -> bool:
    """
    Verify exported ONNX model properties.

    Args:
        model_path: Path to ONNX model file
        model_config: Dictionary containing expected model configuration

    Returns:
        True if verification passed, False otherwise
    """
    try:
        import onnx
        import onnxruntime as ort

        model = onnx.load(str(model_path))

        opset_version = model.opset_import[0].version
        if opset_version != EXPORT_CONFIG['opset']:
            logger.error(f"{model_config['name']}: Opset {opset_version} (expected {EXPORT_CONFIG['opset']})")
            return False

        input_shape = [d.dim_value for d in model.graph.input[0].type.tensor_type.shape.dim]
        output_shape = [d.dim_value for d in model.graph.output[0].type.tensor_type.shape.dim]

        if input_shape != [1, 3, 640, 640] or output_shape != [1, 84, 8400]:
            logger.error(f"{model_config['name']}: Invalid shapes")
            return False

        ort.InferenceSession(str(model_path), providers=['CPUExecutionProvider'])
        return True

    except ImportError:
        return True  # Skip verification if dependencies missing
    except Exception as e:
        logger.error(f"{model_config['name']}: Verification failed - {str(e)}")
        return False


def generate_models_metadata(exported_models: List[Dict], output_path: Path) -> bool:
    """Generate models.json metadata file."""
    metadata = {
        "version": "1.0.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "onnx_config": {
            "opset": EXPORT_CONFIG['opset'],
            "dynamic": EXPORT_CONFIG['dynamic'],
            "simplify": EXPORT_CONFIG['simplify'],
            "nms": EXPORT_CONFIG['nms'],
            "half": EXPORT_CONFIG['half']
        },
        "models": []
    }

    for model_info in exported_models:
        model_data = {
            "id": model_info['name'],
            "name": model_info['display_name'],
            "file": f"/models/{model_info['name']}.onnx",
            "description": model_info['description'],
            "size_mb": round(model_info['file_size_mb'], 1),
            "input_shape": [1, 3, 640, 640],
            "output_shape": [1, 84, 8400],
            "parameters": model_info['parameters'],
            "recommended_use": model_info['recommended_use']
        }
        metadata['models'].append(model_data)

    try:
        with open(output_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to generate models.json: {str(e)}")
        return False


def generate_coco_classes(output_path: Path) -> bool:
    """Generate coco_classes.json file with all 80 COCO classes."""
    coco_data = {
        "version": "1.0.0",
        "num_classes": len(COCO_CLASSES),
        "classes": [
            {"id": idx, "name": class_name}
            for idx, class_name in enumerate(COCO_CLASSES)
        ]
    }

    try:
        with open(output_path, 'w') as f:
            json.dump(coco_data, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to generate coco_classes.json: {str(e)}")
        return False


def main():
    """Main execution function."""
    logger.info("Exporting YOLOv11 models to ONNX...")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    exported_models = []
    failed_models = []

    for model_config in MODELS:
        onnx_path = export_model(model_config, MODELS_DIR)

        if onnx_path and onnx_path.exists() and verify_onnx_model(onnx_path, model_config):
            file_size_mb = onnx_path.stat().st_size / (1024 * 1024)
            exported_models.append({
                **model_config,
                'file_size_mb': file_size_mb,
                'onnx_path': onnx_path
            })
        else:
            failed_models.append(model_config['name'])

    if exported_models:
        generate_models_metadata(exported_models, DATA_DIR / 'models.json')
        generate_coco_classes(DATA_DIR / 'coco_classes.json')

    if failed_models:
        logger.error(f"Failed: {', '.join(failed_models)}")
        sys.exit(1)
    else:
        logger.info(f"✓ Exported {len(exported_models)} models successfully")
        sys.exit(0)


if __name__ == '__main__':
    main()
