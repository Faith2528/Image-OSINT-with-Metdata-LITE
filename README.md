# OSINT Timeline Tracker Matrix (LITE)

A completely client-side, serverless visual intelligence utility designed to parse coordinate arrays, extract telemetry, and map geographic paths directly inside the web browser runtime. This application processes spatial tracking data efficiently without external server dependencies, making it fully optimized for immediate, zero-cost deployment via GitHub Pages.

---

## Core Architecture & Engineering Highlights

* **Client-Side Data Parsing:** Architected to read location arrays and time metadata directly in the browser's execution context, removing the overhead of server-side data processing.
* **Asynchronous Execution & Dynamic Sorting:** Implements modern JavaScript `Promise` structures to handle data streams. Once processing completes, a custom sorting algorithm orders data points chronologically to generate historical tracking paths.
* **Hardware-Accelerated Path Mapping:** Integrates with the Leaflet.js API to dynamically plot coordinate nodes and trace sharp, high-visibility dashed polyline routes over vector map layers.
* **Global Language Transcription Support:** Configured with the OpenStreetMap Germany (`OSM-DE`) tile framework ecosystem to handle background phonetic Latin script transliterations for non-Latin writing systems (Cyrillic, Kanji, Arabic, etc.), ensuring geographical labels remain readable for analysts worldwide.
* **Optimized Visual Hierarchy:** Utilizes real-time, non-destructive CSS filters (`brightness`, `contrast`, `saturate`) applied directly to map canvas tile containers. This technique mutes background noise while making operational markers pop with vibrant neon drop-shadow accent colors.

---

## Stack

* **Core Structure:** HTML5, CSS3 (Custom Properties & Filter Layouts)
* **Scripting Engine:** Vanilla JavaScript (ES6+ Functional Paradigm)
* **Mapping Framework:** Leaflet.js API
* **Hosting Platform:** GitHub Pages Ready

---

## Run On Your Device

Because this Lite edition removes all backend framework constraints, initializing the utility locally takes only a few seconds:

1. Clone this repository to your local workstation:
   ```bash
   git clone https://github.com/your-username/your-repository-name.git

2. Navigate directly into the project directory:

Bash
cd your-repository-name

3. Launch the application:

Option A: Open the index.html file directly inside any modern desktop web browser.

Option B: Spin up a lightweight local developer workspace using an environment like the Live Server extension in your code editor.
