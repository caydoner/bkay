import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Ruler, Layers, Settings, Eye, EyeOff, ChevronDown, ChevronUp, Maximize2, X } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as h3 from 'h3-js';

const BASEMAPS = {
    carto: {
        id: 'carto',
        label: 'Standart (Carto)',
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    },
    esri_imagery: {
        id: 'esri_imagery',
        label: 'Uydu (ESRI)',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    },
    esri_ocean: {
        id: 'esri_ocean',
        label: 'Okyanus (ESRI)',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'
    }
};

// Shim mapboxgl for compatibility with mapbox-gl-draw
if (typeof window !== 'undefined') {
    (window as any).mapboxgl = maplibregl;
}

interface MapContainerProps {
    projectId?: string;
    areaId?: string;
    onLoad?: (map: maplibregl.Map, draw?: MapboxDraw) => void;
    center?: [number, number];
    zoom?: number;
    initialGeometry?: any;
    onCellClick?: (feature: any) => void;
    showMeasureTool?: boolean;
    drawMode?: string | null;
    onDrawComplete?: (geometry: any) => void;
    // New props for multi-select
    multiSelectMode?: boolean;
    selectedCells?: string[];
    onSelectedCellsChange?: (cells: string[]) => void;
    onZoomChange?: (zoom: number) => void;
    fitTrigger?: number; // Increment this to trigger manual fitBounds
    autoZoom?: boolean;
}

const MapContainer: React.FC<MapContainerProps> = ({
    projectId,
    areaId,
    onLoad,
    center = [27.1428, 38.4237], // Default to Izmir
    zoom = 10,
    initialGeometry = null,
    onCellClick,
    showMeasureTool = true,
    drawMode = null,
    onDrawComplete,
    multiSelectMode = false,
    selectedCells = [],
    onSelectedCellsChange,
    onZoomChange,
    fitTrigger,
    autoZoom = false
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    const [measurement, setMeasurement] = useState<{ km: number, nm: number } | null>(null);
    const [currentZoom, setCurrentZoom] = useState(zoom);

    // Layer Control States
    const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);
    const [activeBasemap, setActiveBasemap] = useState<keyof typeof BASEMAPS>('carto');
    const [basemapOpacity, setBasemapOpacity] = useState(1);

    const [showGrid, setShowGrid] = useState(true);
    const [gridColor, setGridColor] = useState('#4f46e5');
    const [gridOpacity, setGridOpacity] = useState(0.3);

    const [isBasemapSettingsOpen, setIsBasemapSettingsOpen] = useState(true);
    const [isLayersSettingsOpen, setIsLayersSettingsOpen] = useState(true);
    const measurePoints = useRef<[number, number][]>([]);
    const [isMeasuring, setIsMeasuring] = useState(false);
    const isMeasuringRef = useRef(false);

    // Refs for interactivity (avoid stale closures)
    const multiSelectModeRef = useRef(multiSelectMode);
    const selectedCellsRef = useRef(selectedCells);
    const onSelectedCellsChangeRef = useRef(onSelectedCellsChange);
    const onCellClickRef = useRef(onCellClick);
    const onDrawCompleteRef = useRef(onDrawComplete);
    const drawModeRef = useRef(drawMode);
    const lastFitTrigger = useRef(fitTrigger);
    const lastDrawCompletionTime = useRef<number>(0);

    useEffect(() => { multiSelectModeRef.current = multiSelectMode; }, [multiSelectMode]);
    useEffect(() => { selectedCellsRef.current = selectedCells; }, [selectedCells]);
    useEffect(() => { onSelectedCellsChangeRef.current = onSelectedCellsChange; }, [onSelectedCellsChange]);
    useEffect(() => { onCellClickRef.current = onCellClick; }, [onCellClick]);
    useEffect(() => { onDrawCompleteRef.current = onDrawComplete; }, [onDrawComplete]);
    useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

    // Handle incoming drawing mode changes from props
    useEffect(() => {
        if (isMapReady && drawRef.current) {
            if (drawMode) {
                // Change to requested mode (draw_polygon, draw_line_string, draw_point)
                drawRef.current.changeMode(drawMode as any);
            } else {
                // Revert to default selection mode
                drawRef.current.changeMode('simple_select');
            }
        }
    }, [drawMode, isMapReady]);

    // Update grid styles when selected cells change
    const updateGridStyles = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        // 1. Independent Visualization (High Reliability)
        const selectedSource = map.getSource('selected-cells') as maplibregl.GeoJSONSource;
        if (selectedSource) {
            const features = selectedCells.map(index => {
                try {
                    const boundary = h3.cellToBoundary(index);
                    const coordinates = [boundary.map(([lat, lng]) => [lng, lat])];
                    coordinates[0].push(coordinates[0][0]); // Close polygon
                    return {
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates },
                        properties: { h3_index: index }
                    };
                } catch (e) {
                    console.error(`Invalid H3 index: ${index}`);
                    return null;
                }
            }).filter(f => f !== null) as any[];

            selectedSource.setData({ type: 'FeatureCollection', features });
        }

        // 2. Highlighting in background grid (Vector source)
        if (map.getLayer('h3-grid-fill')) {
            map.setLayoutProperty('h3-grid-fill', 'visibility', showGrid ? 'visible' : 'none');
            map.setLayoutProperty('h3-grid-outline', 'visibility', showGrid ? 'visible' : 'none');

            if (selectedCells.length > 0) {
                map.setPaintProperty('h3-grid-fill', 'fill-color', [
                    'case',
                    ['in', ['get', 'h3_index'], ['literal', selectedCells]],
                    '#00FFFF', gridColor
                ]);
                map.setPaintProperty('h3-grid-fill', 'fill-opacity', [
                    'case',
                    ['in', ['get', 'h3_index'], ['literal', selectedCells]],
                    Math.max(0.5, gridOpacity + 0.2), gridOpacity
                ]);
            } else {
                map.setPaintProperty('h3-grid-fill', 'fill-color', gridColor);
                map.setPaintProperty('h3-grid-fill', 'fill-opacity', gridOpacity);
            }
            map.setPaintProperty('h3-grid-outline', 'line-color', gridColor);
            map.setPaintProperty('h3-grid-outline', 'line-opacity', gridOpacity + 0.2);
        }
    }, [selectedCells, gridColor, gridOpacity, showGrid]);

    // Apply styles whenever selectedCells change
    useEffect(() => { updateGridStyles(); }, [updateGridStyles]);

    // Effect to manage MVT source and layers (fully reactive)
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isMapReady || !projectId || projectId === 'undefined') return;

        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin.replace(':5174', ':5173');
        const mvtUrl = `${apiUrl}/grids/mvt/${projectId}/{z}/{x}/{y}.pbf${areaId ? `?area_id=${areaId}` : ''}`;

        if (!map.getSource('h3-grid')) {
            // Initial source and layer creation
            map.addSource('h3-grid', {
                type: 'vector',
                tiles: [mvtUrl],
                minzoom: 5,
                maxzoom: 14
            });
            map.addLayer({ id: 'h3-grid-fill', type: 'fill', source: 'h3-grid', 'source-layer': 'h3-layer', paint: { 'fill-color': '#4f46e5', 'fill-opacity': 0.3 } });
            map.addLayer({ id: 'h3-grid-outline', type: 'line', source: 'h3-grid', 'source-layer': 'h3-layer', paint: { 'line-color': '#4f46e5', 'line-width': 1, 'line-opacity': 0.5 } });

            // Setup Interactivity (Delegated to refs to avoid re-binding)
            map.on('click', 'h3-grid-fill', (e) => {
                if (drawModeRef.current) return;
                // Cooldown guard to prevent accidental selection when finishing a drawing
                if (Date.now() - lastDrawCompletionTime.current < 300) return;

                if (e.features && e.features.length > 0) {
                    const h3Index = e.features[0].properties.h3_index;
                    const handler = onSelectedCellsChangeRef.current;
                    const currentCells = selectedCellsRef.current;
                    if (multiSelectModeRef.current && handler) {
                        if (e.originalEvent.shiftKey || currentCells.includes(h3Index)) {
                            handler(currentCells.filter(c => c !== h3Index));
                        } else {
                            handler([...currentCells, h3Index]);
                        }
                    } else if (onCellClickRef.current) {
                        onCellClickRef.current(e.features[0]);
                    }
                }
            });

            map.on('mouseenter', 'h3-grid-fill', () => map.getCanvas().style.cursor = 'pointer');
            map.on('mouseleave', 'h3-grid-fill', () => map.getCanvas().style.cursor = '');

            // Sync current styles
            updateGridStyles();
        } else {
            // Update existing source tiles
            const source = map.getSource('h3-grid') as maplibregl.VectorTileSource;
            if (source && source.setTiles) {
                source.setTiles([mvtUrl]);
            }
        }
    }, [projectId, areaId, isMapReady, updateGridStyles, showGrid]);

    // Handle Basemap Switching and Opacity
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !isMapReady) return;

        // Manage ESRI Raster Basemaps
        const esriBasemaps = ['esri_imagery', 'esri_ocean'];

        esriBasemaps.forEach(bmId => {
            const layerId = `basemap-${bmId}`;
            const isSelected = activeBasemap === bmId;

            if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', isSelected ? 'visible' : 'none');
                map.setPaintProperty(layerId, 'raster-opacity', isSelected ? basemapOpacity : 0);
            } else if (isSelected) {
                // Add if not exists and selected
                map.addSource(layerId, {
                    type: 'raster',
                    tiles: [(BASEMAPS as any)[bmId].url],
                    tileSize: 256
                });
                map.addLayer({
                    id: layerId,
                    type: 'raster',
                    source: layerId,
                    paint: { 'raster-opacity': basemapOpacity }
                }, map.getLayer('h3-grid-fill') ? 'h3-grid-fill' : undefined);
            }
        });

    }, [activeBasemap, basemapOpacity, isMapReady]);

    // Initial Map Initialization
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
            center: center,
            zoom: zoom,
            fadeDuration: 0
        });

        const resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(mapContainerRef.current);
        mapRef.current = map;

        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: false, trash: false },
            defaultMode: 'simple_select',
            styles: [
                { 'id': 'gl-draw-polygon-fill-active', 'type': 'fill', 'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']], 'paint': { 'fill-color': '#f97316', 'fill-opacity': 0.2 } },
                { 'id': 'gl-draw-polygon-stroke-active', 'type': 'line', 'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']], 'paint': { 'line-color': '#f97316', 'line-dasharray': [0.2, 2], 'line-width': 2 } },
                { 'id': 'gl-draw-polygon-fill-inactive', 'type': 'fill', 'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']], 'paint': { 'fill-color': '#3bb2d0', 'fill-opacity': 0.2 } },
                { 'id': 'gl-draw-polygon-stroke-inactive', 'type': 'line', 'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']], 'paint': { 'line-color': '#3bb2d0', 'line-width': 2 } },
                { 'id': 'gl-draw-point-active', 'type': 'circle', 'filter': ['all', ['==', '$type', 'Point'], ['==', 'active', 'true']], 'paint': { 'circle-radius': 8, 'circle-color': '#f97316' } },
                { 'id': 'gl-draw-point-inactive', 'type': 'circle', 'filter': ['all', ['==', '$type', 'Point'], ['==', 'active', 'false']], 'paint': { 'circle-radius': 5, 'circle-color': '#3bb2d0' } },
                { 'id': 'gl-draw-line-active', 'type': 'line', 'filter': ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']], 'paint': { 'line-color': '#f97316', 'line-width': 2 } },
                { 'id': 'gl-draw-line-inactive', 'type': 'line', 'filter': ['all', ['==', '$type', 'LineString'], ['==', 'active', 'false']], 'paint': { 'line-color': '#fbb03b', 'line-width': 2 } }
            ]
        });
        drawRef.current = draw;
        map.addControl(draw as any);

        map.on('load', () => {
            // Setup selected-cells source (always exists for visualization)
            map.addSource('selected-cells', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({ id: 'selected-cells-fill', type: 'fill', source: 'selected-cells', paint: { 'fill-color': '#00FFFF', 'fill-opacity': 0.5 } });
            map.addLayer({ id: 'selected-cells-outline', type: 'line', source: 'selected-cells', paint: { 'line-color': '#00FFFF', 'line-width': 2 } });

            // Initial Draw Sync
            if (initialGeometry) draw.add(initialGeometry);

            // Re-apply study area visibility if it's already defined by initialGeometry
            // (Standard drawing layers usually don't need manual opacity, they use styles defined above)

            // Measurement Layers
            map.addSource('measure-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({ id: 'measure-line-layer', type: 'line', source: 'measure-line', paint: { 'line-color': '#f59e0b', 'line-width': 3, 'line-dasharray': [1, 1] } });
            map.addLayer({ id: 'measure-points', type: 'circle', source: 'measure-line', paint: { 'circle-radius': 5, 'circle-color': '#f59e0b', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });

            updateGridStyles();
            setIsMapReady(true);
            if (onLoad) onLoad(map, draw);
        });

        // Other Map Events
        let zoomTimeout: any = null;
        map.on('zoomend', () => {
            setCurrentZoom(map.getZoom());
            if (zoomTimeout) clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(() => onZoomChange?.(Math.floor(map.getZoom())), 300);
        });

        const scaleControl = new maplibregl.ScaleControl({ maxWidth: 150, unit: 'metric' });
        map.addControl(scaleControl, 'bottom-left');

        // Measurement click handler
        map.on('click', (e) => {
            if (!isMeasuringRef.current) return;
            measurePoints.current.push([e.lngLat.lng, e.lngLat.lat]);
            const pts = measurePoints.current;
            const features: any[] = pts.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} }));
            if (pts.length > 1) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} });
            const source = map.getSource('measure-line') as maplibregl.GeoJSONSource;
            if (source) source.setData({ type: 'FeatureCollection', features });

            const totalKm = pts.slice(1).reduce((acc, p, i) => {
                const [lon1, lat1] = pts[i];
                const [lon2, lat2] = p;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                return acc + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            }, 0);
            setMeasurement({ km: totalKm, nm: totalKm / 1.852 });
        });

        map.on('dblclick', (e) => {
            if (isMeasuringRef.current) {
                e.preventDefault();
                setIsMeasuring(false);
                isMeasuringRef.current = false;
                map.getCanvas().style.cursor = '';
            }
        });

        return () => {
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
            drawRef.current = null;
        };
    }, []);

    // FitBounds handling
    useEffect(() => {
        if (!isMapReady || !mapRef.current) return;
        const manuallyTriggered = fitTrigger !== undefined && fitTrigger !== lastFitTrigger.current;
        lastFitTrigger.current = fitTrigger;
        if (!autoZoom && !manuallyTriggered) return;

        const bounds = new maplibregl.LngLatBounds();
        let hasCoords = false;

        if (initialGeometry) {
            const process = (coords: any) => {
                if (Array.isArray(coords)) {
                    if (typeof coords[0] === 'number') { bounds.extend(coords as [number, number]); hasCoords = true; }
                    else coords.forEach(process);
                }
            };
            process(initialGeometry.coordinates);
        } else if (selectedCells.length > 0) {
            selectedCells.forEach(idx => {
                try {
                    h3.cellToBoundary(idx).forEach(([lat, lng]) => { bounds.extend([lng, lat]); hasCoords = true; });
                } catch { }
            });
        }

        if (hasCoords) mapRef.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    }, [initialGeometry, selectedCells, isMapReady, fitTrigger]);

    // Cleanup drawing if initialGeometry changes to null
    useEffect(() => {
        if (mapRef.current && drawRef.current) {
            drawRef.current.deleteAll();
            if (initialGeometry) drawRef.current.add(initialGeometry);
        }
    }, [initialGeometry]);

    return (
        <div ref={mapContainerRef} className="w-full h-full relative group">
            {/* Layer Control Panel */}
            <div className={`absolute top-4 right-4 z-20 flex flex-col items-end gap-2 transition-all duration-300`}>
                <button
                    onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
                    className={`h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center transition-all ${isLayerControlOpen ? 'bg-primary-600 text-white rotate-90' : 'text-gray-600 hover:bg-gray-50 hover:scale-105'}`}
                >
                    <Layers className="h-6 w-6" />
                </button>

                {isLayerControlOpen && (
                    <div className="bg-white w-72 rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Settings className="h-4 w-4 text-primary-600" /> Katman Kontrolü
                            </h3>
                            <button onClick={() => setIsLayerControlOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">&times;</button>
                        </div>

                        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Basemaps Section */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setIsBasemapSettingsOpen(!isBasemapSettingsOpen)}
                                    className="w-full flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                >
                                    Altlık Haritalar {isBasemapSettingsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>

                                {isBasemapSettingsOpen && (
                                    <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {Object.values(BASEMAPS).map(bm => (
                                                <button
                                                    key={bm.id}
                                                    onClick={() => setActiveBasemap(bm.id as any)}
                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${activeBasemap === bm.id ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
                                                >
                                                    {bm.label}
                                                </button>
                                            ))}
                                        </div>

                                        {activeBasemap !== 'carto' && (
                                            <div className="space-y-1.5 px-1 py-2 bg-gray-50 rounded-xl">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Basemap Şeffaflık</label>
                                                    <span className="text-[10px] font-mono font-bold text-primary-600">{Math.round(basemapOpacity * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.05"
                                                    value={basemapOpacity}
                                                    onChange={(e) => setBasemapOpacity(parseFloat(e.target.value))}
                                                    className="w-full accent-primary-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Layers Section */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setIsLayersSettingsOpen(!isLayersSettingsOpen)}
                                    className="w-full flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                >
                                    Veri Katmanları {isLayersSettingsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>

                                {isLayersSettingsOpen && (
                                    <div className="space-y-5 pt-1 animate-in slide-in-from-top-2 duration-200">
                                        {/* Grid Layer Control */}
                                        <div className="space-y-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-700 flex items-center gap-2">
                                                    Grid Katmanı
                                                </span>
                                                <button
                                                    onClick={() => setShowGrid(!showGrid)}
                                                    className={`p-1.5 rounded-lg transition-all ${showGrid ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-400'}`}
                                                >
                                                    {showGrid ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                </button>
                                            </div>

                                            {showGrid && (
                                                <div className="space-y-3 animate-in fade-in duration-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Renk</label>
                                                            <div className="flex gap-1.5">
                                                                {['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#06b6d4'].map(c => (
                                                                    <button
                                                                        key={c}
                                                                        onClick={() => setGridColor(c)}
                                                                        className={`h-6 w-6 rounded-lg border-2 transition-all ${gridColor === c ? 'border-white ring-2 ring-primary-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                                        style={{ backgroundColor: c }}
                                                                    />
                                                                ))}
                                                                <input
                                                                    type="color"
                                                                    value={gridColor}
                                                                    onChange={(e) => setGridColor(e.target.value)}
                                                                    className="h-6 w-6 rounded-lg overflow-hidden border-0 p-0 bg-transparent cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Şeffaflık</label>
                                                            <span className="text-[10px] font-mono font-bold text-primary-600">{Math.round(gridOpacity * 100)}%</span>
                                                        </div>
                                                        <input
                                                            type="range" min="0" max="1" step="0.05"
                                                            value={gridOpacity}
                                                            onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                                                            className="w-full accent-primary-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scale Control Corner */}
            <div className="absolute bottom-2 left-2 z-10 bg-white/50 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-gray-600 flex items-center gap-1 shadow-sm border border-white/50">
                <Maximize2 className="h-3 w-3" /> {Math.round(currentZoom)}x Ölçek
            </div>

            {/* Distance Tool Label */}
            {measurement && (
                <div className="absolute top-4 left-4 z-10 animate-in slide-in-from-left-4 duration-300">
                    <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-amber-100 flex items-center gap-3">
                        <div className="h-8 w-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                            <Ruler className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-amber-700 uppercase leading-none mb-1">Mesafe</span>
                            <div className="flex gap-2">
                                <span className="text-xs font-bold text-gray-800">{measurement.km.toFixed(2)} km</span>
                                <span className="text-xs font-medium text-gray-400">{measurement.nm.toFixed(2)} nm</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setMeasurement(null);
                                measurePoints.current = [];
                                const source = mapRef.current?.getSource('measure-line') as maplibregl.GeoJSONSource;
                                if (source) source.setData({ type: 'FeatureCollection', features: [] });
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {multiSelectMode && selectedCells.length > 0 && (
                <div className="absolute top-4 left-4 z-10 bg-cyan-500/90 text-white px-3 py-2 rounded-xl shadow-lg">
                    <span className="text-xs font-bold">{selectedCells.length} hücre seçili</span>
                </div>
            )}
            {showMeasureTool && (
                <div className="absolute top-4 left-16 z-10 flex flex-col gap-2">
                    <button
                        onClick={() => {
                            if (isMeasuring) {
                                setIsMeasuring(false); isMeasuringRef.current = false; measurePoints.current = []; setMeasurement(null);
                                const source = mapRef.current?.getSource('measure-line') as maplibregl.GeoJSONSource;
                                if (source) source.setData({ type: 'FeatureCollection', features: [] });
                                if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
                            } else {
                                setIsMeasuring(true); isMeasuringRef.current = true;
                                if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'crosshair';
                            }
                        }}
                        className={`p-2.5 rounded-xl shadow-lg border transition-all flex items-center gap-2 font-bold text-xs ${isMeasuring ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'}`}
                    >
                        <Ruler className="h-4 w-4" /> {isMeasuring ? 'Ölçümü Bitir' : 'Mesafe Ölç'}
                    </button>
                    {measurement && (
                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kilometre</span>
                                    <span className="text-sm font-black text-primary-600">{measurement.km.toFixed(2)} km</span>
                                </div>
                                <div className="h-px bg-gray-100 w-full" />
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deniz Mili</span>
                                    <span className="text-sm font-black text-amber-600">{measurement.nm.toFixed(2)} nm</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MapContainer;
