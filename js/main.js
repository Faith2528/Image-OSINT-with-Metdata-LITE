document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('imageInput');
    const uploadText = document.getElementById('uploadText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const telemetryList = document.getElementById('telemetryList');

    // --- 1. Map Canvas Groundwork Layer Setup ---
    let initialLat = 14.4290;
    let initialLon = 120.9360;
    let initialZoom = 4;

    const map = L.map('map', { zoomControl: false }).setView([initialLat, initialLon], initialZoom);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Global tracking layers to clear markers out cleanly between runs
    let markerGroup = L.featureGroup().addTo(map);
    let polylineTrack = null;

    // --- 2. Input Node UI Event Observers ---
    if (fileInput && uploadText) {
        fileInput.addEventListener('change', (e) => {
            const count = e.target.files.length;
            if (count > 0) {
                uploadText.textContent = `LOADED: ${count} PAYLOAD FILES`;
                uploadText.style.color = '#38bdf8';
            }
        });
    }

    // --- 3. Core EXIF Processing Engine ---
    analyzeBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        if (files.length === 0) return alert("Please select target assets first.");

        // Clean out existing maps data tracks
        markerGroup.clearLayers();
        if (polylineTrack) map.removeLayer(polylineTrack);

        const processedNodes = [];

        // Wrapper to parse single file records into tracking arrays
        const parseFile = (file) => {
            return new Promise((resolve) => {
                EXIF.getData(file, function() {
                    const allTags = EXIF.getAllTags(this);
                    
                    let lat = null;
                    let lon = null;
                    let timestamp = "N/A";
                    let status = "Not Found";

                    // Handle GPS translation arrays from Degree-Minute-Second sets
                    if (allTags.GPSLatitude && allTags.GPSLongitude) {
                        lat = convertDMSToDD(allTags.GPSLatitude, allTags.GPSLatitudeRef);
                        lon = convertDMSToDD(allTags.GPSLongitude, allTags.GPSLongitudeRef);
                        status = "Found";
                    }

                    if (allTags.DateTimeOriginal) {
                        // Reformat EXIF colons into clean readable string formats
                        timestamp = allTags.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                    }

                    resolve({
                        name: file.name,
                        status: status,
                        timestamp: timestamp,
                        coordinates: lat && lon ? { lat, lon } : null
                    });
                });
            });
        };

        // Extract metadata items across the selected file array concurrent lines
        for (let i = 0; i < files.length; i++) {
            const result = await parseFile(files[i]);
            processedNodes.push(result);
        }

        // Chronological Sorting: Reorder files by timestamp metadata values 
        processedNodes.sort((a, b) => {
            if (a.timestamp === "N/A") return 1;
            if (b.timestamp === "N/A") return -1;
            return a.timestamp.localeCompare(b.timestamp);
        });

        // Update the UI Panels and Leaflet Plots
        renderTelemetryDashboard(processedNodes);
    });

    // --- 4. Subgrid Render Logic Engine ---
    function renderTelemetryDashboard(nodes) {
        telemetryList.innerHTML = ''; // Wipe standby message
        const trackingLineCoordinates = [];
        const activeMarkers = [];

        nodes.forEach((node) => {
            const isFound = node.status === "Found" && node.coordinates;
            const latVal = isFound ? node.coordinates.lat.toFixed(6) : "N/A";
            const lonVal = isFound ? node.coordinates.lon.toFixed(6) : "N/A";
            
            // Build the dynamic UI HTML elements block matching old layout properties
            const itemCard = document.createElement('div');
            itemCard.className = `telemetry-item ${isFound ? 'has-coordinates' : ''}`;
            if (isFound) {
                itemCard.dataset.lat = node.coordinates.lat;
                itemCard.dataset.lon = node.coordinates.lon;
            }

            itemCard.innerHTML = `
                <div class="item-meta-row">
                    <span class="img-filename" title="${node.name}">${node.name}</span>
                    <span class="status-badge ${node.status.toLowerCase().replace(' ', '-')}">
                        <span class="status-dot"></span>
                        ${node.status}
                    </span>
                </div>
                <div class="item-details-grid">
                    <div class="detail-line"><span class="lbl">TIME:</span> <span class="val accent-blue">${node.timestamp}</span></div>
                    <div class="detail-line"><span class="lbl">LAT:</span> <span class="val monospace-num">${latVal}</span></div>
                    <div class="detail-line"><span class="lbl">LON:</span> <span class="val monospace-num">${lonVal}</span></div>
                </div>
            `;

            // Plot interactive pins on Map layers directly
            if (isFound) {
                const marker = L.marker([node.coordinates.lat, node.coordinates.lon]).addTo(markerGroup);
                marker.bindPopup(`
                    <div style="color: #0c0f17; font-family: sans-serif; font-size: 11px; line-height: 1.45;">
                        <strong style="color: #0ea5e9; font-weight: 700;">[!] NODE TRACKED: ${node.name}</strong><br>
                        <span style="color: #64748b;">TIME:</span> ${node.timestamp}<br>
                        <span style="color: #64748b;">LAT:</span> ${latVal}<br>
                        <span style="color: #64748b;">LON:</span> ${lonVal}
                    </div>
                `);

                trackingLineCoordinates.push([node.coordinates.lat, node.coordinates.lon]);
                activeMarkers.push(marker);

                // Attach click listeners to cards so they jump direct to localized map bounds
                itemCard.addEventListener('click', () => {
                    map.setView([node.coordinates.lat, node.coordinates.lon], 16, { animate: true, duration: 0.75 });
                    marker.openPopup();
                });
            }

            telemetryList.appendChild(itemCard);
        });

        // Generate tracking path overlays chronologically
        if (trackingLineCoordinates.length > 1) {
            polylineTrack = L.polyline(trackingLineCoordinates, {
                color: '#38bdf8',
                weight: 2,
                dashArray: '5, 8',
                opacity: 0.85,
                smoothFactor: 1.0
            }).addTo(map);
        }

        // Adjust bounding window to encompass all plot layers
        if (trackingLineCoordinates.length > 0) {
            map.fitBounds(markerGroup.getBounds().pad(0.20));
        }
    }

    // Mathematical utility helper: Converts Degree/Minutes/Seconds EXIF object shapes to Decimal Degrees
    function convertDMSToDD(dms, ref) {
        if (!dms) return null;
        let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
        if (ref === "S" || ref === "W") dd = dd * -1;
        return dd;
    }
});