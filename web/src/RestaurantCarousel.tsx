import React from "react";
import { useToolOutput, useTheme } from "./hooks/useOpenAiGlobal";

interface Restaurant {
    id: string;
    name: string;
    cuisine: string;
    rating: number;
    price_range: string;
    description: string;
    address: string;
    image_url: string;
    order_url: string;
}

interface ToolOutput {
    widget?: {
        provider: string;
        type: string;
        layout: string;
    };
    restaurants: Restaurant[];
}

export function RestaurantCarousel() {
    const toolOutput = useToolOutput() as ToolOutput;
    const theme = useTheme() || "light";

    const restaurants = toolOutput?.restaurants || [];

    if (restaurants.length === 0) {
        return (
            <div className={`empty-state ${theme}`}>
                <p>No restaurants found</p>
            </div>
        );
    }

    const handleOrderClick = (url: string) => {
        if ((window as any).openai?.openExternal) {
            (window as any).openai.openExternal({ href: url });
        } else {
            window.open(url, "_blank");
        }
    };

    return (
        <div className={`restaurant-carousel ${theme}`}>
            <div className="restaurant-grid">
                {restaurants.map((restaurant) => (
                    <div key={restaurant.id} className="restaurant-card">
                        <div className="card-image">
                            {restaurant.image_url ? (
                                <img src={restaurant.image_url} alt={restaurant.name} />
                            ) : (
                                <div className="placeholder-image">
                                    <span>🍽️</span>
                                </div>
                            )}
                        </div>
                        <div className="card-content">
                            <h3 className="restaurant-name">{restaurant.name}</h3>
                            <div className="restaurant-meta">
                                <span className="cuisine">{restaurant.cuisine}</span>
                                <span className="separator">•</span>
                                <span className="price-range">{restaurant.price_range}</span>
                            </div>
                            <div className="rating">
                                <span className="stars">{"⭐".repeat(Math.round(restaurant.rating))}</span>
                                <span className="rating-value">{restaurant.rating.toFixed(1)}</span>
                            </div>
                            {restaurant.description && (
                                <p className="description">{restaurant.description}</p>
                            )}
                            <p className="address">{restaurant.address}</p>
                            <button
                                className="order-button"
                                onClick={() => handleOrderClick(restaurant.order_url)}
                            >
                                Order Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .restaurant-carousel {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          padding: 16px;
        }

        .restaurant-carousel.dark {
          background: #1a1a1a;
          color: #e0e0e0;
        }

        .restaurant-carousel.light {
          background: #ffffff;
          color: #1a1a1a;
        }

        .restaurant-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .restaurant-card {
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }

        .light .restaurant-card {
          background: #fff;
          border: 1px solid #e0e0e0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .dark .restaurant-card {
          background: #2a2a2a;
          border: 1px solid #404040;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .restaurant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .card-image {
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .dark .card-image {
          background: #333;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
        }

        .card-content {
          padding: 16px;
        }

        .restaurant-name {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .restaurant-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          margin-bottom: 8px;
          color: #666;
        }

        .dark .restaurant-meta {
          color: #999;
        }

        .separator {
          opacity: 0.5;
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .stars {
          color: #ffa500;
        }

        .rating-value {
          font-weight: 500;
        }

        .description {
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 12px;
          color: #555;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .dark .description {
          color: #aaa;
        }

        .address {
          font-size: 13px;
          color: #777;
          margin-bottom: 16px;
        }

        .dark .address {
          color: #888;
        }

        .order-button {
          width: 100%;
          padding: 12px;
          background: #10a37f;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .order-button:hover {
          background: #0d8c6d;
        }

        .order-button:active {
          transform: scale(0.98);
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #999;
        }
      `}</style>
        </div>
    );
}
