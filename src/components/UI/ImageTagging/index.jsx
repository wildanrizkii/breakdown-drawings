"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Download,
  ShoppingCart,
  X,
  Tag,
  Plus,
  Search,
} from "lucide-react";

const ImageTaggingApp = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [tags, setTags] = useState([]);
  const [cart, setCart] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [selectedTagIndex, setSelectedTagIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 0,
    height: 0,
  });
  const [draggedTag, setDraggedTag] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Database items (simulasi database sparepart motor)
  const databaseItems = [
    { id: 1, name: "Ban Dalam", color: "#3B82F6", code: "BD001" },
    { id: 2, name: "Ban Luar", color: "#EF4444", code: "BL002" },
    { id: 3, name: "Rem Cakram", color: "#10B981", code: "RC003" },
    { id: 4, name: "Kampas Rem", color: "#F59E0B", code: "KR004" },
    { id: 5, name: "Oli Mesin", color: "#8B5CF6", code: "OM005" },
    { id: 6, name: "Filter Udara", color: "#EC4899", code: "FU006" },
    { id: 7, name: "Busi", color: "#06B6D4", code: "BS007" },
    { id: 8, name: "Rantai Motor", color: "#84CC16", code: "RM008" },
    { id: 9, name: "Gear Set", color: "#DC2626", code: "GS009" },
    { id: 10, name: "Kopling", color: "#7C3AED", code: "KP010" },
    { id: 11, name: "Karburator", color: "#059669", code: "KB011" },
    { id: 12, name: "CDI", color: "#D97706", code: "CD012" },
    { id: 13, name: "Spion", color: "#BE185D", code: "SP013" },
    { id: 14, name: "Lampu Depan", color: "#0891B2", code: "LD014" },
    { id: 15, name: "Shockbreaker", color: "#65A30D", code: "SB015" },
    { id: 16, name: "Velg", color: "#DC2626", code: "VG016" },
    { id: 17, name: "Jok Motor", color: "#7C2D12", code: "JM017" },
    { id: 18, name: "Knalpot", color: "#374151", code: "KN018" },
    { id: 19, name: "Aki Motor", color: "#1E40AF", code: "AM019" },
    { id: 20, name: "Speedometer", color: "#BE123C", code: "SM020" },
  ];

  // Drag and Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragOver to false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];

      // Check if it's an image file
      if (file.type.startsWith("image/")) {
        processImageFile(file);
      } else {
        alert("Harap upload file gambar (PNG, JPG, GIF)");
      }
    }
  };

  const processImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
      setTags([]);
      setCart([]);

      // Dapatkan ukuran natural image untuk perhitungan posisi yang konsisten
      const img = new Image();
      img.onload = () => {
        setImageNaturalSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleImageClick = (event) => {
    if (!uploadedImage || !imageRef.current) return;

    const img = event.target;
    const rect = img.getBoundingClientRect();

    // Koordinat klik relatif terhadap elemen img
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Hitung persentase posisi relatif terhadap ukuran gambar yang ditampilkan
    const percentageX = clickX / img.clientWidth;
    const percentageY = clickY / img.clientHeight;

    // Koordinat untuk canvas (ukuran asli gambar)
    const canvasX = percentageX * imageNaturalSize.width;
    const canvasY = percentageY * imageNaturalSize.height;

    // Hitung posisi dropdown yang smart agar tidak keluar dari bounds
    const dropdownWidth = 280; // sesuai dengan minWidth dropdown
    const dropdownHeight = 320; // perkiraan tinggi dropdown
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let dropdownX = event.clientX;
    let dropdownY = event.clientY;

    // Adjust horizontal position
    if (dropdownX + dropdownWidth > viewportWidth) {
      dropdownX = viewportWidth - dropdownWidth - 10; // 10px margin
    }
    if (dropdownX < 10) {
      dropdownX = 10; // 10px margin from left
    }

    // Adjust vertical position
    if (dropdownY + dropdownHeight > viewportHeight) {
      dropdownY = viewportHeight - dropdownHeight - 10; // 10px margin
    }
    if (dropdownY < 10) {
      dropdownY = 10; // 10px margin from top
    }

    setDropdownPosition({
      x: dropdownX,
      y: dropdownY,
      canvasX: canvasX,
      canvasY: canvasY,
      percentageX: percentageX,
      percentageY: percentageY,
    });
    setSearchQuery(""); // Reset search query
    setShowDropdown(true);
  };

  // Filter items berdasarkan search query
  const filteredItems = databaseItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle mouse events untuk drag functionality
  const handleMouseDown = (e, tagId, tagIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Hitung offset dari center tag
    const tag = tags.find((t) => t.id === tagId);
    if (tag) {
      const currentDisplayX = tag.percentageX * imageRef.current.clientWidth;
      const currentDisplayY = tag.percentageY * imageRef.current.clientHeight;

      setDraggedTag(tagId);
      setDragOffset({
        x: offsetX - currentDisplayX,
        y: offsetY - currentDisplayY,
      });
      setSelectedTagIndex(null); // Close popup when dragging
    }
  };

  const handleMouseMove = (e) => {
    if (!draggedTag || !imageRef.current) return;

    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Hitung posisi baru dengan drag offset
    const newX = offsetX - dragOffset.x;
    const newY = offsetY - dragOffset.y;

    // Clamp ke dalam bounds gambar
    const clampedX = Math.max(0, Math.min(newX, imageRef.current.clientWidth));
    const clampedY = Math.max(0, Math.min(newY, imageRef.current.clientHeight));

    // Convert ke percentage
    const newPercentageX = clampedX / imageRef.current.clientWidth;
    const newPercentageY = clampedY / imageRef.current.clientHeight;

    // Update posisi tag
    setTags((prev) =>
      prev.map((tag) =>
        tag.id === draggedTag
          ? {
              ...tag,
              percentageX: newPercentageX,
              percentageY: newPercentageY,
              canvasX: newPercentageX * imageNaturalSize.width,
              canvasY: newPercentageY * imageNaturalSize.height,
            }
          : tag
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedTag(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Add event listeners untuk mouse events
  useEffect(() => {
    if (draggedTag) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggedTag, dragOffset]);

  const handleItemSelect = (item) => {
    const newTag = {
      id: Date.now(),
      canvasX: dropdownPosition.canvasX,
      canvasY: dropdownPosition.canvasY,
      percentageX: dropdownPosition.percentageX,
      percentageY: dropdownPosition.percentageY,
      item: item,
    };

    setTags((prev) => [...prev, newTag]);

    // Langsung tambahkan ke keranjang
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) {
      setCart((prev) =>
        prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart((prev) => [...prev, { ...item, quantity: 1 }]);
    }

    setShowDropdown(false);
  };

  const addToCart = (tag) => {
    const existingItem = cart.find((item) => item.id === tag.item.id);
    if (existingItem) {
      setCart((prev) =>
        prev.map((item) =>
          item.id === tag.item.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart((prev) => [...prev, { ...tag.item, quantity: 1 }]);
    }
  };

  const removeTag = (tagId) => {
    // Cari tag yang akan dihapus untuk mendapatkan item info
    const tagToRemove = tags.find((tag) => tag.id === tagId);

    if (tagToRemove) {
      // Kurangi quantity item di keranjang atau hapus jika quantity = 1
      const existingItem = cart.find((item) => item.id === tagToRemove.item.id);
      if (existingItem) {
        if (existingItem.quantity > 1) {
          setCart((prev) =>
            prev.map((item) =>
              item.id === tagToRemove.item.id
                ? { ...item, quantity: item.quantity - 1 }
                : item
            )
          );
        } else {
          setCart((prev) =>
            prev.filter((item) => item.id !== tagToRemove.item.id)
          );
        }
      }
    }

    // Hapus tag
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const downloadTaggedImage = useCallback(() => {
    if (!uploadedImage || tags.length === 0) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Helper function untuk rounded rectangle
    const roundRect = (ctx, x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Gambar image asli
      ctx.drawImage(img, 0, 0);

      // Hitung skala untuk ukuran elemen berdasarkan resolusi gambar
      const scaleFactor = Math.min(img.width, img.height) / 500; // Base scale untuk resolusi 500px
      const minScale = 1; // Minimum scale factor
      const maxScale = 8; // Maximum scale factor
      const scale = Math.max(minScale, Math.min(maxScale, scaleFactor));

      // Gambar tags
      tags.forEach((tag, index) => {
        const radius = 15 * scale;
        const strokeWidth = 4 * scale;
        const numberFontSize = Math.max(16 * scale, 16);
        const labelFontSize = Math.max(18 * scale, 14);
        const priceFontSize = Math.max(14 * scale, 12);
        const labelOffset = 25 * scale;
        const padding = 12 * scale;
        const borderRadius = 8 * scale;

        // Gambar shadow untuk tag circle
        ctx.beginPath();
        ctx.arc(
          tag.canvasX + 2 * scale,
          tag.canvasY + 2 * scale,
          radius,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();

        // Gambar lingkaran tag dengan gradient effect
        const gradient = ctx.createRadialGradient(
          tag.canvasX - radius * 0.3,
          tag.canvasY - radius * 0.3,
          0,
          tag.canvasX,
          tag.canvasY,
          radius
        );
        gradient.addColorStop(0, tag.item.color + "FF");
        gradient.addColorStop(1, tag.item.color + "CC");

        ctx.beginPath();
        ctx.arc(tag.canvasX, tag.canvasY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Border dengan efek glow
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = strokeWidth;
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.shadowBlur = 6 * scale;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Gambar nomor dengan efek shadow
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${numberFontSize}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Shadow untuk text
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 3 * scale;
        ctx.shadowOffsetX = 1 * scale;
        ctx.shadowOffsetY = 1 * scale;
        ctx.fillText((index + 1).toString(), tag.canvasX, tag.canvasY);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Gambar label
        const labelText = tag.item.name;
        const codeText = `Kode: ${tag.item.code}`;

        // Ukur teks untuk menentukan ukuran background
        ctx.font = `bold ${labelFontSize}px Arial, sans-serif`;
        const labelWidth = ctx.measureText(labelText).width;
        ctx.font = `${priceFontSize}px Arial, sans-serif`;
        const codeWidth = ctx.measureText(codeText).width;

        const maxTextWidth = Math.max(labelWidth, codeWidth);
        const labelHeight = labelFontSize + priceFontSize + padding * 1.5;

        // Konversi displayX/Y ke canvas coordinates untuk bounds checking
        const imageDisplayWidth = imageRef.current?.clientWidth || img.width;
        const imageDisplayHeight = imageRef.current?.clientHeight || img.height;

        const displayXInCanvas = tag.percentageX * img.width;
        const displayYInCanvas = tag.percentageY * img.height;

        // Cek bounds untuk label positioning
        const wouldExceedRight =
          displayXInCanvas + maxTextWidth + padding * 2 + labelOffset >
          img.width;
        const wouldExceedBottom =
          displayYInCanvas + labelHeight / 2 > img.height;
        const wouldExceedTop = displayYInCanvas - labelHeight / 2 < 0;

        // Tentukan posisi label
        let labelX, labelY, textAlign;

        // Horizontal positioning
        if (wouldExceedRight) {
          // Label di kiri
          labelX = tag.canvasX - labelOffset;
          textAlign = "right";
        } else {
          // Label di kanan (default)
          labelX = tag.canvasX + labelOffset;
          textAlign = "left";
        }

        // Vertical positioning
        if (wouldExceedBottom && !wouldExceedTop) {
          // Label di atas
          labelY = displayYInCanvas - labelOffset;
        } else if (wouldExceedTop && !wouldExceedBottom) {
          // Label di bawah
          labelY = displayYInCanvas + labelOffset;
        } else {
          // Label di tengah (default)
          labelY = displayYInCanvas;
        }

        // Hitung posisi background berdasarkan alignment
        let bgX, bgY;
        if (textAlign === "right") {
          bgX = labelX - maxTextWidth - padding * 2;
        } else {
          bgX = labelX - padding;
        }
        bgY = labelY - labelHeight / 2;

        // Gambar shadow untuk background label
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        roundRect(
          ctx,
          bgX + 3 * scale,
          bgY + 3 * scale,
          maxTextWidth + padding * 2,
          labelHeight,
          borderRadius
        );
        ctx.fill();

        // Gambar background label dengan gradient
        const labelGradient = ctx.createLinearGradient(
          bgX,
          bgY,
          bgX,
          bgY + labelHeight
        );
        labelGradient.addColorStop(0, "rgba(0, 0, 0, 0.9)");
        labelGradient.addColorStop(1, "rgba(0, 0, 0, 0.7)");

        ctx.fillStyle = labelGradient;
        roundRect(
          ctx,
          bgX,
          bgY,
          maxTextWidth + padding * 2,
          labelHeight,
          borderRadius
        );
        ctx.fill();

        // Border untuk background
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1 * scale;
        roundRect(
          ctx,
          bgX,
          bgY,
          maxTextWidth + padding * 2,
          labelHeight,
          borderRadius
        );
        ctx.stroke();

        // Gambar nama produk
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${labelFontSize}px Arial, sans-serif`;
        ctx.textAlign = textAlign === "right" ? "right" : "left";
        ctx.textBaseline = "top";

        // Shadow untuk nama produk
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 2 * scale;
        ctx.shadowOffsetX = 1 * scale;
        ctx.shadowOffsetY = 1 * scale;

        const nameX = textAlign === "right" ? labelX - padding : labelX;
        ctx.fillText(labelText, nameX, bgY + padding);

        // Gambar kode item
        ctx.fillStyle = "#FFD700"; // Gold color untuk kode
        ctx.font = `${priceFontSize}px Arial, sans-serif`;
        ctx.fillText(
          codeText,
          nameX,
          bgY + padding + labelFontSize + 4 * scale
        );

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });

      // Download
      const link = document.createElement("a");
      link.download = "tagged-image.png";
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = uploadedImage;
  }, [uploadedImage, tags]);

  return (
    <div className="h-fit p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sparepart Motor Tagging App
          </h1>
          <p className="text-gray-600">
            Upload gambar motor, tambahkan tag sparepart, dan download hasilnya
          </p>
        </div>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Upload & Tag Image
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload size={16} />
                  Upload
                </button>
                {uploadedImage && tags.length > 0 && (
                  <button
                    onClick={downloadTaggedImage}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="relative">
              {uploadedImage ? (
                <div className="relative inline-block">
                  <img
                    ref={imageRef}
                    src={uploadedImage}
                    alt="Uploaded"
                    className="max-w-full h-auto rounded-lg shadow-md cursor-crosshair"
                    onClick={handleImageClick}
                  />

                  {/* Render tags */}
                  {tags.map((tag, index) => {
                    // Hitung posisi tag berdasarkan persentase dari ukuran gambar saat ini
                    const currentDisplayX =
                      tag.percentageX * (imageRef.current?.clientWidth || 0);
                    const currentDisplayY =
                      tag.percentageY * (imageRef.current?.clientHeight || 0);

                    // Hitung posisi popup berdasarkan posisi tag dan bounds
                    let popupLeft = "20px";
                    let popupTop = "-20px";
                    let transform = "translateY(-50%)";

                    if (imageRef.current) {
                      const imageRect =
                        imageRef.current.getBoundingClientRect();
                      const imageWidth = imageRect.width;
                      const imageHeight = imageRect.height;

                      // Ukuran popup
                      const popupWidth = 200;
                      const popupHeight = 120;

                      // Posisi absolut tag dalam container gambar
                      const tagAbsoluteX = imageRect.left + currentDisplayX;
                      const tagAbsoluteY = imageRect.top + currentDisplayY;

                      // Ukuran viewport
                      const viewportWidth = window.innerWidth;
                      const viewportHeight = window.innerHeight;

                      // Cek bounds untuk menentukan posisi popup
                      const wouldExceedRight =
                        tagAbsoluteX + 20 + popupWidth > viewportWidth;
                      const wouldExceedBottom =
                        tagAbsoluteY + popupHeight / 2 > viewportHeight;
                      const wouldExceedTop = tagAbsoluteY - popupHeight / 2 < 0;
                      const wouldExceedLeft =
                        tagAbsoluteX - 20 - popupWidth < 0;

                      // Logic positioning horizontal
                      if (wouldExceedRight && !wouldExceedLeft) {
                        // Popup di kiri jika tidak cukup ruang di kanan
                        popupLeft = `-${popupWidth + 8}px`;
                      } else {
                        // Default: popup di kanan
                        popupLeft = "20px";
                      }

                      // Logic positioning vertical
                      if (wouldExceedBottom && !wouldExceedTop) {
                        // Popup di atas jika tidak cukup ruang di bawah
                        popupTop = `-${popupHeight + 8}px`;
                        transform = "none";
                      } else if (wouldExceedTop && !wouldExceedBottom) {
                        // Popup di bawah jika tidak cukup ruang di atas
                        popupTop = "32px";
                        transform = "none";
                      } else {
                        // Default: popup di tengah vertikal
                        popupTop = "-20px";
                        transform = "translateY(-50%)";
                      }
                    }

                    return (
                      <div
                        key={tag.id}
                        className="absolute"
                        style={{
                          left: `${currentDisplayX}px`,
                          top: `${currentDisplayY}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer group transition-transform ${
                            draggedTag === tag.id
                              ? "scale-110 shadow-xl"
                              : "hover:scale-105"
                          }`}
                          style={{
                            backgroundColor: tag.item.color,
                            cursor: draggedTag === tag.id ? "grabbing" : "grab",
                          }}
                          onMouseDown={(e) => handleMouseDown(e, tag.id, index)}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Hanya buka popup jika tidak sedang drag
                            if (!draggedTag) {
                              setSelectedTagIndex(
                                selectedTagIndex === index ? null : index
                              );
                            }
                          }}
                        >
                          {index + 1}
                        </div>

                        {selectedTagIndex === index && (
                          <div
                            className="absolute bg-white rounded-lg shadow-xl p-3 border z-10 min-w-48 max-w-52"
                            style={{
                              left: popupLeft,
                              top: popupTop,
                              transform: transform,
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-800 text-sm">
                                {tag.item.name}
                              </h4>
                              <button
                                onClick={() => setSelectedTagIndex(null)}
                                className="text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              Kode: {tag.item.code}
                            </p>
                            <button
                              onClick={() => removeTag(tag.id)}
                              className="w-full bg-red-600 text-white py-1 px-3 rounded text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <X size={12} />
                              Hapus Tag
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50 scale-[1.02]"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload
                    className={`mx-auto h-12 w-12 mb-4 transition-colors ${
                      isDragOver ? "text-blue-500" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`mb-2 transition-colors ${
                      isDragOver ? "text-blue-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {isDragOver
                      ? "Lepaskan file di sini"
                      : "Klik untuk upload atau drag & drop gambar"}
                  </p>
                  <p className="text-sm text-gray-400">
                    PNG, JPG, GIF hingga 10MB
                  </p>
                </div>
              )}
            </div>

            {uploadedImage && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <Tag className="inline w-4 h-4 mr-1" />
                  Klik pada gambar untuk menambahkan tag sparepart motor
                </p>
              </div>
            )}
          </div>

          {/* Cart Section - Moved below upload */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ShoppingCart size={20} />
              Daftar Sparepart ({cart.length})
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Belum ada sparepart yang dipilih
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Kode: {item.code}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.quantity}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dropdown for selecting items */}
        {showDropdown && (
          <div
            className="fixed bg-white rounded-lg shadow-xl border z-50 max-h-80 overflow-hidden"
            style={{
              left: `${dropdownPosition.x}px`,
              top: `${dropdownPosition.y}px`,
              minWidth: "280px",
            }}
          >
            <div className="p-3">
              <h3 className="font-semibold text-gray-800 mb-3 px-1">
                Pilih Sparepart Motor:
              </h3>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Cari sparepart..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Items List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Sparepart tidak ditemukan
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-3 transition-colors"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          Kode: {item.code}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="border-t p-2">
              <button
                onClick={() => setShowDropdown(false)}
                className="w-full px-3 py-2 text-gray-500 hover:bg-gray-100 rounded text-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Overlay to close dropdown */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          ></div>
        )}
      </div>
    </div>
  );
};

export default ImageTaggingApp;
