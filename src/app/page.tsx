"use client";
import React, { useRef, useState, useCallback } from "react";
import Image from "next/image";
import styles from "./page.module.css";

const MAX_IMAGES = 10;

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
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

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Roof Image Analysis</h1>
        <p>
          Upload up to 10 roof images. Only image files are accepted.
        </p>
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
          disabled={images.length === 0}
        >
          Get Instant Roof Analysis
        </button>
      </main>
      <footer className={styles.footer}>
        <a
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
