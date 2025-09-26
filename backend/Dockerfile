# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libpq-dev \
        python3-dev \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libgomp1 \
        libgtk-3-0 \
        libavcodec-dev \
        libavformat-dev \
        libswscale-dev \
        libv4l-dev \
        libxvidcore-dev \
        libx264-dev \
        libjpeg-dev \
        libpng-dev \
        libtiff-dev \
        libopenblas-dev \
        liblapack-dev \
        libgl1-mesa-dev \
        libegl1-mesa-dev \
        libgthread-2.0-0 \
        gfortran \
        wget \
        unzip \
        python3-opencv \
        libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies in stages
COPY requirements.txt .

# First install base scientific computing packages
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir numpy==1.24.4 scipy==1.11.4

# Then install all other dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create directories for models and logs
RUN mkdir -p /app/models /app/logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
