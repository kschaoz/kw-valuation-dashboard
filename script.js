// Global variable to store parsed data from the uploaded file
let shopLotData = [];
// This will store the actual column name found in the Excel for 'Location'
let actualLocationHeader = 'Location';

// --- Utility Functions ---

/**
 * Calculates the median of an array of numbers.
 * @param {Array<number>} arr - The array of numbers.
 * @returns {number} The median value.
 */
function calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Updates the price readout elements and error message.
 * @param {number} median - The calculated median price.
 * @param {number|string} weightedAvg - The calculated weighted average price or 'N/A'.
 * @param {string} error - Any error message to display.
 */
function updatePriceDisplays(median, weightedAvg, error) {
    document.getElementById('median-price-readout').textContent = `RM ${median.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('weighted-avg-price-readout').textContent = typeof weightedAvg === 'number' ? `RM ${weightedAvg.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : weightedAvg;
    document.getElementById('weightage-error').textContent = error;
}

/**
 * Updates the displayed value next to a slider.
 * @param {string} sliderId - The ID of the slider.
 * @param {number} value - The current value of the slider.
 */
function updateSliderValueDisplay(sliderId, value) {
    // Extract part of the ID (e.g., "2020-later" from "weight-2020-later")
    const displayId = sliderId.replace('weight-', 'value-');
    document.getElementById(displayId).textContent = parseFloat(value).toFixed(2);
}

/**
 * Plots the median price over time using Plotly.js.
 * @param {Array<Object>} data - The dataset, each object must have 'Year' and 'Price'.
 */
function plotPriceOverTime(data) {
    if (!data || data.length === 0) {
        // Render an empty graph with a message
        Plotly.newPlot('price-over-time-graph', [], {
            title: 'Upload data to see trends',
            template: 'plotly_dark',
            paper_bgcolor: '#2C2C2C', /* Darker background for paper area */
            plot_bgcolor: '#2C2C2C', /* Darker background for plot area */
            font: { color: '#FFFFFF' }, // White font for general text
            title_font_color: 'var(--kw-red)' // KW Red for title
        });
        return;
    }

    // Group data by year and calculate median price for each year
    const pricesByYear = data.reduce((acc, row) => {
        const year = row.Year;
        if (year && typeof row.Price === 'number' && !isNaN(row.Price)) {
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(row.Price);
        }
        return acc;
    }, {});

    const years = Object.keys(pricesByYear).sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
    const medianPrices = years.map(year => calculateMedian(pricesByYear[year]));

    const trace = {
        x: years,
        y: medianPrices,
        mode: 'lines+markers',
        type: 'scatter',
        name: 'Median Price',
        line: { color: 'var(--kw-white)', width: 2 }, // White line
        marker: { color: 'var(--kw-red)', size: 8, symbol: 'circle' } // KW Red markers
    };

    const layout = {
        title: 'Median Shop Lot Price Over Time',
        template: 'plotly_dark', // Use Plotly's dark theme base
        xaxis: {
            title: 'Transaction Year',
            tickfont: { color: '#FFFFFF' },
            titlefont: { color: '#FFFFFF' },
            showgrid: true,
            gridcolor: 'rgba(255,255,255,0.1)' // Lighter grid lines
        },
        yaxis: {
            title: 'Median Price (RM)',
            tickfont: { color: '#FFFFFF' },
            titlefont: { color: '#FFFFFF' },
            showgrid: true,
            gridcolor: 'rgba(255,255,255,0.1)'
        },
        plot_bgcolor: '#2C2C2C', /* Darker background for plot area */
        paper_bgcolor: '#2C2C2C', /* Darker background for paper area */
        title_font_color: 'var(--kw-red)', /* KW Red for graph title */
        font: { color: 'var(--kw-white)' }, /* White font for general text */
        margin: { t: 50, b: 50, l: 60, r: 20 }
    };

    Plotly.newPlot('price-over-time-graph', [trace], layout, { displayModeBar: false });
}

// --- Main Dashboard Update Logic ---

/**
 * Recalculates and updates all dashboard components based on current data and slider values.
 */
function updateDashboard() {
    if (shopLotData.length === 0) {
        updatePriceDisplays(0, 0, "Please upload an Excel file to perform calculations.");
        plotPriceOverTime([]); // Show empty graph prompt
        return;
    }

    // Get slider values
    const w2020Later = parseFloat(document.getElementById('weight-2020-later').value);
    const w20002019 = parseFloat(document.getElementById('weight-2000-2019').value);
    const w1999Earlier = parseFloat(document.getElementById('weight-1999-earlier').value);

    // Update slider value displays
    updateSliderValueDisplay('weight-2020-later', w2020Later);
    updateSliderValueDisplay('weight-2000-2019', w20002019);
    updateSliderValueDisplay('weight-1999-earlier', w1999Earlier);

    // 1. Median Price Calculation
    const allPrices = shopLotData.map(row => row.Price).filter(price => typeof price === 'number' && !isNaN(price));
    const medianPrice = calculateMedian(allPrices);

    // 2. Weighted Average Price Calculation
    const totalWeight = w2020Later + w20002019 + w1999Earlier;
    let errorMessage = "";
    let weightedAvgPrice = 0;

    // Check if total weight is approximately 1.0 (allow for floating point inaccuracies)
    if (Math.abs(totalWeight - 1.0) > 0.001) {
        errorMessage = "Weightage is not adjusted properly (sum must be 1.0)";
        weightedAvgPrice = "N/A"; // Display N/A if weights are off
    } else {
        // Filter data for each period and get their median prices
        const data2020Later = shopLotData.filter(row => row.Year >= 2020 && typeof row.Price === 'number' && !isNaN(row.Price)).map(row => row.Price);
        const data20002019 = shopLotData.filter(row => row.Year >= 2000 && row.Year <= 2019 && typeof row.Price === 'number' && !isNaN(row.Price)).map(row => row.Price);
        const data1999Earlier = shopLotData.filter(row => row.Year <= 1999 && typeof row.Price === 'number' && !isNaN(row.Price)).map(row => row.Price);

        let sumWeightedPrices = 0;
        if (data2020Later.length > 0) sumWeightedPrices += calculateMedian(data2020Later) * w2020Later;
        if (data20002019.length > 0) sumWeightedPrices += calculateMedian(data20002019) * w20002019;
        if (data1999Earlier.length > 0) sumWeightedPrices += calculateMedian(data1999Earlier) * w1999Earlier;

        weightedAvgPrice = sumWeightedPrices;
    }

    // Update display elements
    updatePriceDisplays(medianPrice, weightedAvgPrice, errorMessage);
    plotPriceOverTime(shopLotData); // Update the graph with current data
}

// --- Event Listeners and Initial Setup ---

document.addEventListener('DOMContentLoaded', () => {
    // Initial call to set up the dashboard state (empty before file upload)
    updateDashboard();

    // Event listener for file input change
    document.getElementById('file-upload').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            document.getElementById('upload-status').textContent = 'No file selected.';
            return;
        }

        document.getElementById('upload-status').textContent = `Processing "${file.name}"...`;
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false }); // cellDates for proper date parsing

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: null }); // Get data as array of arrays, raw:false for formatted dates/numbers

                if (json.length === 0) {
                    throw new Error("Uploaded file is empty or could not be parsed.");
                }

                // Assume first row is header
                const headers = json[0];
                const dataRows = json.slice(1);

                // Dynamically detect 'Price' and 'Transaction Date' columns
                let priceColIndex = -1;
                let dateColIndex = -1;
                let locationColIndex = -1;

                const potentialPriceHeaders = ['price', 'shop lot price', 'value', 'amount'];
                const potentialDateHeaders = ['transaction date', 'date', 'sales date', 'buy date'];
                const potentialLocationHeaders = ['location', 'area', 'district', 'region', 'place'];

                headers.forEach((header, index) => {
                    if (header) {
                        const lowerHeader = header.toLowerCase().trim();
                        if (potentialPriceHeaders.includes(lowerHeader) && priceColIndex === -1) {
                            priceColIndex = index;
                        }
                        if (potentialDateHeaders.includes(lowerHeader) && dateColIndex === -1) {
                            dateColIndex = index;
                        }
                        if (potentialLocationHeaders.includes(lowerHeader) && locationColIndex === -1) {
                            locationColIndex = index;
                            actualLocationHeader = header; // Store the exact header name
                        }
                    }
                });

                if (priceColIndex === -1 || dateColIndex === -1) {
                    throw new Error("Could not find 'Price' or 'Transaction Date' column in the uploaded file. Please ensure your headers are clear.");
                }

                shopLotData = dataRows.map(row => {
                    const rawDate = row[dateColIndex];
                    let transactionDate = null;

                    // Handle various date formats (numeric date, string date)
                    if (typeof rawDate === 'number') {
                        // XLSX dates are numbers representing days since 1900-01-01 (or 1904-01-01)
                        // This converts them to JS Date objects. Add 1 day if workbook is 1900-based
                        // (Excel's 1900-date system incorrectly assumes Feb 29, 1900 existed).
                        // For simplicity, using XLSX's built-in parsing (cellDates: true) is best.
                        transactionDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000)); // 25569 is diff between 1970/1/1 and 1900/1/1
                    } else if (typeof rawDate === 'string') {
                        transactionDate = new Date(rawDate);
                    } else if (rawDate instanceof Date) {
                        transactionDate = rawDate; // Already a Date object
                    }

                    const year = transactionDate && !isNaN(transactionDate.getFullYear()) ? transactionDate.getFullYear() : null;
                    const price = parseFloat(row[priceColIndex]);
                    const location = locationColIndex !== -1 ? (row[locationColIndex] || 'Unknown') : 'Unknown';

                    return {
                        'Transaction Date': transactionDate,
                        'Year': year,
                        'Price': isNaN(price) ? 0 : price, // Default to 0 if price is not a number
                        'Location': location
                    };
                }).filter(row => row.Year !== null && row.Price > 0); // Filter out rows with invalid dates or zero/negative prices

                if (shopLotData.length === 0) {
                     throw new Error("No valid data rows found after parsing. Check 'Transaction Date' and 'Price' columns.");
                }

                document.getElementById('upload-status').textContent = `File "${file.name}" uploaded successfully. Data ready.`;
                document.getElementById('header-rename-input-container').style.display = 'flex';
                document.getElementById('location-header-input').value = actualLocationHeader; // Show detected header
                updateDashboard(); // Re-render dashboard with new data

            } catch (error) {
                console.error("Error parsing file:", error);
                document.getElementById('upload-status').textContent = `Error processing file: ${error.message}`;
                shopLotData = []; // Clear data on error
                updateDashboard(); // Reset dashboard display
            }
        };

        // For Excel files, read as ArrayBuffer
        reader.readAsArrayBuffer(file);
    });

    // Event listener for manual location header update
    document.getElementById('update-header-button').addEventListener('click', () => {
        const newHeader = document.getElementById('location-header-input').value.trim();
        if (newHeader && shopLotData.length > 0) {
            // Note: This dashboard doesn't dynamically re-parse based on this.
            // It's mostly for informing the user what header was detected/expected.
            // If 'Location' was used in calculations, a full re-parse might be needed.
            actualLocationHeader = newHeader; // Update the stored header name
            document.getElementById('upload-status').textContent = `Location header noted as "${newHeader}".`;
            // No direct dashboard update needed here as calculations don't use 'Location'
        }
    });

    // Add event listeners for slider changes to trigger dashboard update
    document.getElementById('weight-2020-later').addEventListener('input', updateDashboard);
    document.getElementById('weight-2000-2019').addEventListener('input', updateDashboard);
    document.getElementById('weight-1999-earlier').addEventListener('input', updateDashboard);

    // Handle drag and drop for the upload area
    const uploadArea = document.querySelector('.upload-button');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            document.getElementById('file-upload').files = files; // Set the files to the input
            document.getElementById('file-upload').dispatchEvent(new Event('change')); // Trigger change event
        }
    });
});