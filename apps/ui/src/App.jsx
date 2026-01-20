import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [urlInput, setUrlInput] = useState("");

  const [data, setData] = useState({ items: [], total: 0 });

  const [controls, setControls] = useState({
    page: 1,
    search: "",
    type: "",
    loading: false,
  });

  const [isPolling, setIsPolling] = useState(false);

  const updateControl = (field, value) => {
    setControls((prev) => ({
      ...prev,
      [field]: value,
      page: field === "search" || field === "type" ? 1 : prev.page,
    }));
  };

  const fetchMedia = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setControls((prev) => ({ ...prev, loading: true }));

      try {
        const res = await axios.get(`${API_URL}/api/media`, {
          params: {
            page: controls.page,
            search: controls.search,
            type: controls.type,
          },
        });

        setData({ items: res.data.data, total: res.data.total });
      } catch (err) {
        console.error("Failed to fetch media", err);
      } finally {
        if (!isBackground) setControls((prev) => ({ ...prev, loading: false }));
      }
    },
    [controls.page, controls.search, controls.type],
  );

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMedia();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [fetchMedia]);

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      console.log("Polling for updates...");
      fetchMedia(true);
    }, 3000);

    const timeout = setTimeout(() => {
      setIsPolling(false);
      console.log("Stopped polling.");
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPolling, fetchMedia]);

  const handleScrape = async () => {
    if (!urlInput.trim()) return;
    const urls = urlInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u);

    try {
      await axios.post(`${API_URL}/api/scrape`, { urls });
      alert(`Accepted ${urls.length} URLs. Background processing started.`);
      setUrlInput("");

      setIsPolling(true);
    } catch (err) {
      alert("Error submitting URLs");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Media Scraper</h1>
      </header>

      {/* Ingestion */}
      <div className="card ingestion-box">
        <h3>Add URLs</h3>
        <textarea
          rows="3"
          placeholder="https://example.com (one per line)"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <div className="button-group">
          <button className="primary-btn" onClick={handleScrape}>
            Crawl
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search URLs..."
          value={controls.search}
          onChange={(e) => updateControl("search", e.target.value)}
        />

        <select
          value={controls.type}
          onChange={(e) => updateControl("type", e.target.value)}
        >
          <option value="">All Media</option>
          <option value="image">Images Only</option>
          <option value="video">Videos Only</option>
        </select>

        {/* NEW: Manual Refresh Button */}
        <button className="secondary-btn" onClick={() => fetchMedia()}>
          Refresh Data
        </button>

        <span className="stats">Found: {data.total}</span>
      </div>

      {/* Grid */}
      <div className="media-grid">
        {controls.loading && !isPolling ? (
          <p>Loading...</p>
        ) : (
          data.items.map((item) => (
            <div key={item.id} className="media-card">
              {item.type === "image" ? (
                <img src={item.media_url} alt="scraped" loading="lazy" />
              ) : (
                <video controls preload="metadata">
                  <source src={item.media_url} />
                </video>
              )}
              <div className="media-info">
                <a href={item.source_url} target="_blank" rel="noreferrer">
                  Source
                </a>
                <span className={`badge ${item.type}`}>{item.type}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={controls.page === 1}
          onClick={() =>
            setControls((prev) => ({ ...prev, page: prev.page - 1 }))
          }
        >
          Previous
        </button>
        <span>Page {controls.page}</span>
        <button
          disabled={data.items.length < 20}
          onClick={() =>
            setControls((prev) => ({ ...prev, page: prev.page + 1 }))
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default App;
