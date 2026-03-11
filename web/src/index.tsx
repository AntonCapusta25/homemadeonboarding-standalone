import React from "react";
import { createRoot } from "react-dom/client";
import { RestaurantCarousel } from "./RestaurantCarousel";

// Wait for DOM to be ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
} else {
    initWidget();
}

function initWidget() {
    const rootElement = document.getElementById("root");

    if (!rootElement) {
        console.error("Root element not found");
        return;
    }

    const root = createRoot(rootElement);

    root.render(
        <React.StrictMode>
            <RestaurantCarousel />
        </React.StrictMode>
    );
}
