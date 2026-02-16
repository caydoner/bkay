FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PostGIS/Shapely/GeoPandas
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use 5173 to match the current user preference/setup
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5173", "--reload"]
