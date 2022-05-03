const melexir = require("bindings")("melexir");

// Results to return if Melexir could not be run
const null_results = {
    spectrum: [[0], [0], [0]],
    residuals: [[0], [0], [0]]
}

// Receive message from Main Window
onmessage = function(e) {
    let image = e.data;
    // Need to make sure it's a 2D array
    // (Didn't do this in a single if statement bc if it's a 1D or 0D array, 
    //      image[0][0] would throw an error)
    if (Array.isArray(image)) {
        if (Array.isArray(image[0])) {
            if (Array.isArray(image[0][0])) {
                // Dimension is larger than 2D
                console.log("MELEXIR Worker: image needs to be a 2D array - image is too large");
                postMessage(null_results);
            } else {
                // It is a 2D array
                let results = melexir.process(image);
                console.log("MELEXIR Worker: Successfully process image");
                postMessage(results);
            }
        } else {
            // Array is only 1D
            console.log("MELEXIR Worker: image needs to be a 2D array - image is only 1D array");
            postMessage(null_results);
        }
    } else {
        // image is not an array
        console.log("MELEXIR Worker: image needs to be a 2D array - image is not an array");
        postMessage(null_results);
    }
}