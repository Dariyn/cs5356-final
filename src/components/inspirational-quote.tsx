"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function InspirationalQuote() {
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuote = async () => {
    setIsLoading(true);
    try {
      // Using the type.fit API for inspirational quotes
      const response = await fetch("https://type.fit/api/quotes");
      
      if (!response.ok) {
        throw new Error("Failed to fetch quote");
      }
      
      const data = await response.json();
      
      // Select a random quote from the response
      const randomQuote = data[Math.floor(Math.random() * data.length)];
      
      setQuote({
        text: randomQuote.text,
        author: randomQuote.author || "Unknown"
      });
    } catch (error) {
      console.error("Error fetching quote:", error);
      toast.error("Failed to fetch inspirational quote");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center mt-4">
      {quote ? (
        <div className="py-2 px-4 bg-white rounded-lg shadow-sm max-w-2xl mx-auto">
          <p className="text-gray-800 italic">"{quote.text}"</p>
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