document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('imageInput');
    const uploadText = document.getElementById('uploadText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const telemetryList = document.getElementById('telemetryList');

    const telemetryPanel = document.getElementById('telemetryPanel');
    const telemetryToggleBtn = document.getElementById('telemetryToggleBtn');
    const previewPanel = document.getElementById('previewPanel');
    const previewToggleBtn = document.getElementById('previewToggleBtn');
    const previewImage = document.getElementById('previewImage');
    const previewPanelTitle = document.getElementById('previewPanelTitle');

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

    let markerGroup = L.featureGroup().addTo(map);
    let polylineTrack = null;

    // Dictionary tracking map structures to bind panel rows to map marker instances
    let markerInstancesMap = {};

    // --- 2. Minimize/Maximize Action Handlers ---
    telemetryToggleBtn.addEventListener('click', () => {
        telemetryPanel.classList.toggle('minimized');
    });

    previewToggleBtn.addEventListener('click', () => {
        previewPanel.classList.toggle('minimized');
    });

    function showTargetImagePreview(fileUrl, filename) {
        previewImage.src = fileUrl;
        previewPanelTitle.textContent = `PREVIEW: ${filename.toUpperCase()}`;
        previewPanel.classList.remove('hidden');
        previewPanel.classList.remove('minimized');
    }

    // --- 3. Input Node UI Event Observers ---
    if (fileInput && uploadText) {
        fileInput.addEventListener('change', (e) => {
            const count = e.target.files.length;
            if (count > 0) {
                uploadText.textContent = `LOADED: ${count} PAYLOAD FILES`;
                uploadText.style.color = '#38bdf8';
            }
        });
    }

    // --- 4. Core EXIF Processing Engine ---
    analyzeBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        if (files.length === 0) return alert("Please select target assets first.");

        markerGroup.clearLayers();
        if (polylineTrack) map.removeLayer(polylineTrack);
        previewPanel.classList.add('hidden');
        previewImage.src = "";
        markerInstancesMap = {};

        const processedNodes = [];

        const parseFile = (file) => {
            return new Promise((resolve) => {
                EXIF.getData(file, function() {
                    const allTags = EXIF.getAllTags(this);
                    
                    let lat = null;
                    let lon = null;
                    let timestamp = "N/A";
                    let status = "Not Found";

                    if (allTags.GPSLatitude && allTags.GPSLongitude) {
                        lat = convertDMSToDD(allTags.GPSLatitude, allTags.GPSLatitudeRef);
                        lon = convertDMSToDD(allTags.GPSLongitude, allTags.GPSLongitudeRef);
                        status = "Found";
                    }

                    if (allTags.DateTimeOriginal) {
                        timestamp = allTags.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                    }

                    resolve({
                        name: file.name,
                        status: status,
                        timestamp: timestamp,
                        coordinates: lat && lon ? { lat, lon } : null,
                        localUrl: URL.createObjectURL(file)
                    });
                });
            });
        };

        for (let i = 0; i < files.length; i++) {
            const result = await parseFile(files[i]);
            processedNodes.push(result);
        }

        // Chronological Sequence Sort
        processedNodes.sort((a, b) => {
            if (a.timestamp === "N/A") return 1;
            if (b.timestamp === "N/A") return -1;
            return a.timestamp.localeCompare(b.timestamp);
        });

        renderTelemetryDashboard(processedNodes);
    });

    // --- 5. Subgrid Render Logic Engine ---
    function renderTelemetryDashboard(nodes) {
        telemetryList.innerHTML = '';
        const trackingLineCoordinates = [];
        const coordinateGroups = {};

        // 🛰️ PROXIMITY THRESHOLD MATRIX CONFIGURATION
        // Delta values of 0.00025 coordinate degrees equals roughly ~25 meters on the ground.
        // Any assets uploaded within this radius threshold will cluster into a unified horizontal pod.
        const PROXIMITY_THRESHOLD = 0.00025; 

        // Pass A: Build the spatial bucket dictionaries using distance detection loops
        nodes.forEach((node) => {
            const isFound = node.status === "Found" && node.coordinates;
            
            if (isFound) {
                // Keep the raw, chronological path trace perfectly intact at its exact drop point
                trackingLineCoordinates.push([node.coordinates.lat, node.coordinates.lon]);
                
                let matchedGroupKey = null;

                // Loop through existing groups to verify if this node qualifies as "nearby"
                Object.keys(coordinateGroups).forEach((key) => {
                    const group = coordinateGroups[key];
                    const latDelta = Math.abs(group.lat - node.coordinates.lat);
                    const lonDelta = Math.abs(group.lon - node.coordinates.lon);

                    if (latDelta < PROXIMITY_THRESHOLD && lonDelta < PROXIMITY_THRESHOLD) {
                        matchedGroupKey = key;
                    }
                });

                if (matchedGroupKey) {
                    // Proximate match verified: append node asset to the existing chain group
                    coordinateGroups[matchedGroupKey].assets.push(node);
                } else {
                    // New anchor point discovered: initialize a fresh geographic pod index
                    const newKey = `${node.coordinates.lat.toFixed(6)},${node.coordinates.lon.toFixed(6)}`;
                    coordinateGroups[newKey] = {
                        lat: node.coordinates.lat,
                        lon: node.coordinates.lon,
                        assets: [node]
                    };
                }
            }

            // Generate UI entry list metrics cards on the floating sidebar container
            const latVal = isFound ? node.coordinates.lat.toFixed(6) : "N/A";
            const lonVal = isFound ? node.coordinates.lon.toFixed(6) : "N/A";
            
            const itemCard = document.createElement('div');
            itemCard.className = `telemetry-item ${isFound ? 'has-coordinates' : ''}`;
            
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

            itemCard.addEventListener('click', () => {
                showTargetImagePreview(node.localUrl, node.name);
                
                if (isFound) {
                    // Scan keys backwards to find which group marker handles this specific node asset instance
                    let targetKey = null;
                    Object.keys(coordinateGroups).forEach((key) => {
                        if (coordinateGroups[key].assets.includes(node)) {
                            targetKey = key;
                        }
                    });

                    const sharedMarkerInstance = markerInstancesMap[targetKey];
                    if (sharedMarkerInstance) {
                        map.setView([node.coordinates.lat, node.coordinates.lon], 17, { animate: true, duration: 0.75 });
                        sharedMarkerInstance.openPopup();
                    }
                }
            });

            telemetryList.appendChild(itemCard);
        });

        // Pass B: Render the clean, non-overlapping custom layout elements onto Leaflet
        Object.keys(coordinateGroups).forEach((key) => {
            const group = coordinateGroups[key];
            const count = group.assets.length;
            const primaryAsset = group.assets[0];

            let markerHtml = '';

            if (count === 1) {
                markerHtml = `
                    <div class="marker-intel-pod">
                        <img src="${primaryAsset.localUrl}" class="marker-avatar-thumb" alt="Target Capture Node">
                    </div>
                `;
            } else {
                // Generate the seamless inline avatar chains for nearby items
                const avatarChainHtml = group.assets.map(asset => 
                    `<img src="${asset.localUrl}" class="marker-avatar-thumb" title="${asset.name}">`
                ).join('');

                markerHtml = `
                    <div class="marker-intel-pod is-stacked">
                        ${avatarChainHtml}
                        <span class="marker-stack-counter">+${count}</span>
                    </div>
                `;
            }

            const customIcon = L.divIcon({
                html: markerHtml,
                className: 'custom-image-marker',
                iconSize: null,
                iconAnchor: [0, 0]
            });

            const marker = L.marker([group.lat, group.lon], { icon: customIcon }).addTo(markerGroup);

            // Dynamically itemize popup information windows for multi-image clusters
            let popupContent = `<div style="color: #0c0f17; font-family: sans-serif; font-size: 11px; line-height: 1.5; max-width: 240px;">`;
            if (count > 1) {
                popupContent += `<strong style="color: #10b981; font-weight: 700;">[!] PROXIMITY CLUSTER (${count} ASSETS)</strong><div style="margin-top: 5px; border-top: 1px solid #e2e8f0; padding-top: 5px; max-height: 120px; overflow-y: auto;">`;
                group.assets.forEach((asset, idx) => {
                    popupContent += `<div style="margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><b style="color: #64748b;">#${idx+1}:</b> ${asset.name}</div>`;
                });
                popupContent += `</div>`;
            } else {
                popupContent += `
                    <strong style="color: #0ea5e9; font-weight: 700;">[!] NODE TRACKED: ${primaryAsset.name}</strong><br>
                    <span style="color: #64748b;">TIME:</span> ${primaryAsset.timestamp}<br>
                    <span style="color: #64748b;">LAT:</span> ${group.lat.toFixed(6)}<br>
                    <span style="color: #64748b;">LON:</span> ${group.lon.toFixed(6)}
                `;
            }
            popupContent += `</div>`;
            marker.bindPopup(popupContent);

            marker.on('click', () => {
                showTargetImagePreview(primaryAsset.localUrl, primaryAsset.name);
            });

            markerInstancesMap[key] = marker;
        });

        // Map chronological line tracks across exact positions
        if (trackingLineCoordinates.length > 1) {
            polylineTrack = L.polyline(trackingLineCoordinates, {
                color: '#38bdf8',
                weight: 2,
                dashArray: '5, 8',
                opacity: 0.85,
                smoothFactor: 1.0
            }).addTo(map);
        }

        if (trackingLineCoordinates.length > 0) {
            map.fitBounds(markerGroup.getBounds().pad(0.20));
        }
    }

    function convertDMSToDD(dms, ref) {
        if (!dms) return null;
        let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
        if (ref === "S" || ref === "W") dd = dd * -1;
        return dd;
    }
});