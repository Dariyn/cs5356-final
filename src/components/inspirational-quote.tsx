"use client";

import { useState } from "react";
import { toast } from "sonner";

// Hardcoded API key as requested
const API_KEY = "eWkrS5ufCtCgDAWpI0tiVw==BdKXuxJSmE6BkULd";

export default function InspirationalQuote() {
  const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuote = async () => {
    setIsLoading(true);
    try {
      // Using the api-ninjas.com quotes API with hardcoded API key
      const response = await fetch("https://api.api-ninjas.com/v1/quotes", {
        headers: {
          'X-Api-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch quote");
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        setQuote({
          quote: data[0].quote,
          author: data[0].author
        });
      } else {
        toast.error("No quotes returned from API");
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
      toast.error("Failed to fetch inspirational quote");
      
      // Set a fallback quote on error
      setQuote({
        quote: "The best preparation for tomorrow is doing your best today.",
        author: "H. Jackson Brown Jr."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center mt-4">
      {quote ? (
        <div className="py-2 px-4 bg-white rounded-lg shadow-sm max-w-2xl mx-auto">
          <p className="text-gray-800 italic">"{quote.quote}"</p>
          <p className="text-gray-600 text-sm mt-1">- {quote.author}</p>
        </div>
      ) : (
        <button
          onClick={fetchQuote}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
        >
          {isLoading ? "Loading..." : "Get Inspirational Quote"}
        </button>
      )}
    </div>
  );
} 