"use client";
import React, { useRef, useState, useCallback } from "react";
import Image from "next/image";
import styles from "./page.module.css";

const MAX_IMAGES = 10;

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle files from input
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (file) => file.type.startsWith("image/")
    );
    const newImages = [...images, ...fileArray].slice(0, MAX_IMAGES);
    setImages(newImages);
  }, [images]);

  // File input change
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  // Remove image
  const removeImage = (idx: number) => {
    setImages((imgs) => imgs.filter((_, i) => i !== idx));
  };

  // Open file dialog
  const openFileDialog = () => {
    inputRef.current?.click();
  };

  // Submit images to backend
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const formData = new FormData();
      formData.append("address", address);
      images.forEach((file, idx) => {
        formData.append("images", file);
      });
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: await res.text() };
      }
      if (!res.ok) {
        setError(data.error || `Server error: ${res.status}`);
        setResponse(data);
        return;
      }
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image
          src="/roofer-logo.png"
          alt="roofer.com logo"
          width={180}
          height={40}
          priority
        />
      </header>
      <main className={styles.mainCard}>
        <h1 className={styles.title}>Roofer AI</h1>
        <p className={styles.tagline}>Instant roof analysis powered by AI</p>
        <div className={styles.addressSection}>
          <label htmlFor="address" className={styles.addressLabel}>
            Home Address or City/Region <span style={{ color: '#e57373' }}>*</span>
          </label>
          <input
            id="address"
            className={styles.addressInput}
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. Arlington, Texas"
            required
            autoComplete="off"
          />
          <div className={styles.addressNote}>
            Location is only collected to provide more accurate advice based on weather. This data is not stored.
          </div>
        </div>
        <div
          className={styles.uploadZone}
          tabIndex={0}
          onClick={openFileDialog}
          style={{ cursor: "pointer" }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onFileChange}
            disabled={images.length >= MAX_IMAGES}
          />
          <span>
            {images.length < MAX_IMAGES
              ? "Click to select images"
              : "Maximum 10 images selected"}
          </span>
        </div>
        {images.length > 0 && (
          <div className={styles.previewGrid}>
            {images.map((file, idx) => {
              const url = URL.createObjectURL(file);
              return (
                <div key={idx} className={styles.previewItem}>
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className={styles.previewImg}
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeImage(idx)}
                    type="button"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <button
          className={styles.primary}
          type="button"
          disabled={images.length === 0 || loading || !address.trim()}
          onClick={handleSubmit}
        >
          {loading ? "Analyzing..." : "Get Instant Roof Analysis"}
        </button>
        {error && (
          <div style={{ color: "#f44336", marginTop: 16 }}>
            {error}
            {response && response.error && (
              <pre style={{ background: "#fbe9e7", color: "#b71c1c", padding: 8, borderRadius: 4, marginTop: 8, maxWidth: 600, overflowX: "auto" }}>
                {typeof response.error === "string" ? response.error : JSON.stringify(response.error, null, 2)}
              </pre>
            )}
          </div>
        )}
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <div className={styles.loadingText}>Analyzing your roof images…</div>
          </div>
        )}
        {response && response.summary && !loading && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              padding: 18,
              color: "#111",
              fontWeight: 500,
              maxWidth: 600,
              margin: "0 auto"
            }}>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                {response.summary}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className={styles.footerBar}>
        <span>Powered by <a href="https://roofer.com" target="_blank" rel="noopener noreferrer">Roofer.com</a></span>
      </footer>
    </div>
  );
}
