"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Download,
  List,
  X,
  Tag,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  FileSpreadsheet,
} from "lucide-react";
import supabase from "@/app/utils/db";
import * as ExcelJS from "exceljs";
import toast from "react-hot-toast";

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
  // New states for image dimensions
  const [imageDisplaySize, setImageDisplaySize] = useState({
    width: 0,
    height: 0,
  });
  const [draggedTag, setDraggedTag] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // New states for multi-item selection
  const [selectedItems, setSelectedItems] = useState([]);
  const [editingTag, setEditingTag] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Export form states
  const [showExportForm, setShowExportForm] = useState(false);
  const [exportFormData, setExportFormData] = useState({
    partNo: "",
    partName: "",
    customer: "",
    project: "",
    revisionDate: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    approvers: {
      dibuat: "",
      diperiksa1: "",
      diperiksa2: "",
      disetujui: "",
    },
    revisions: [
      { rev: "", description: "", date: "" },
      { rev: "", description: "", date: "" },
      { rev: "", description: "", date: "" },
      {
        rev: "△",
        description: "New Release",
        date: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      },
    ],
  });

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Database items from main_part with joins
  const [databaseItems, setDatabaseItems] = useState([]);

  const fetchMainParts = async () => {
    try {
      // Fetch all related data in parallel
      const [
        { data: mainPartData, error: mainPartError },
        { data: honda },
        { data: cmw },
        { data: unit },
        { data: eq_supply },
        { data: material },
        { data: import_data },
        { data: lokal },
        { data: maker },
      ] = await Promise.all([
        supabase.from("main_part").select("*"),
        supabase.from("honda").select("id_honda, nama").order("nama"),
        supabase.from("cmw").select("id_cmw, nama").order("nama"),
        supabase.from("unit").select("id_unit, nama").order("nama"),
        supabase
          .from("eq_supply_1")
          .select("id_eq_supply_1, nama")
          .order("nama"),
        supabase.from("material").select("id_material, nama").order("nama"),
        supabase.from("import").select("id_import, nama").order("nama"),
        supabase.from("lokal").select("id_lokal, nama").order("nama"),
        supabase.from("maker").select("id_maker, nama").order("nama"),
      ]);

      if (mainPartError) throw mainPartError;

      // Create lookup maps for better performance
      const hondaMap = new Map(
        honda?.map((item) => [item.id_honda, item.nama]) || []
      );
      const cmwMap = new Map(
        cmw?.map((item) => [item.id_cmw, item.nama]) || []
      );
      const unitMap = new Map(
        unit?.map((item) => [item.id_unit, item.nama]) || []
      );
      const eqSupplyMap = new Map(
        eq_supply?.map((item) => [item.id_eq_supply_1, item.nama]) || []
      );
      const materialMap = new Map(
        material?.map((item) => [item.id_material, item.nama]) || []
      );
      const importMap = new Map(
        import_data?.map((item) => [item.id_import, item.nama]) || []
      );
      const lokalMap = new Map(
        lokal?.map((item) => [item.id_lokal, item.nama]) || []
      );
      const makerMap = new Map(
        maker?.map((item) => [item.id_maker, item.nama]) || []
      );

      const dataMaster = mainPartData.map((row, index) => ({
        id: row.id || `main_part_${index}`,
        partName: row.part_name || "Unknown Part",
        partNo: row.part_no || "No Part Number",
        quantity: row.quantity || 0,
        // Original IDs
        idHonda: row.id_honda,
        idCmw: row.id_cmw,
        idUnit: row.id_unit,
        idEqSupply1: row.id_eq_supply_1,
        idMaterial: row.id_material,
        idImport: row.id_import,
        idLokal: row.id_lokal,
        idMaker: row.id_maker,
        // Resolved names
        hondaName: hondaMap.get(row.id_honda) || "-",
        cmwName: cmwMap.get(row.id_cmw) || "-",
        unitName: unitMap.get(row.id_unit) || "-",
        eqSupplyName: eqSupplyMap.get(row.id_eq_supply_1) || "-",
        materialName: materialMap.get(row.id_material) || "-",
        importName: importMap.get(row.id_import) || "-",
        lokalName: lokalMap.get(row.id_lokal) || "-",
        makerName: makerMap.get(row.id_maker) || "-",
        color: "#3B82F6", // Default color
      }));

      // Filter out items with invalid/duplicate IDs and ensure unique keys
      const uniqueItems = dataMaster.filter(
        (item, index, arr) =>
          item.id && arr.findIndex((i) => i.id === item.id) === index
      );

      setDatabaseItems(uniqueItems);
    } catch (error) {
      console.error("Error fetching main_part data: ", error);
      toast.error("Error fetching main_part data: " + error.message);
    }
  };

  // Function to recalculate cart based on all tags
  const recalculateCart = (updatedTags) => {
    const itemCounts = new Map();

    // Count occurrences of each item across all tags
    updatedTags.forEach((tag) => {
      tag.items.forEach((item) => {
        const currentCount = itemCounts.get(item.id) || 0;
        itemCounts.set(item.id, currentCount + 1);
      });
    });

    // Create cart with counted quantities
    const newCart = [];
    const addedItems = new Set();

    updatedTags.forEach((tag) => {
      tag.items.forEach((item) => {
        if (!addedItems.has(item.id)) {
          addedItems.add(item.id);
          newCart.push({
            ...item,
            quantity: itemCounts.get(item.id), // Use counted quantity instead of database quantity
          });
        }
      });
    });

    setCart(newCart);
  };

  useEffect(() => {
    fetchMainParts();
  }, []);

  // Calculate pagination values
  const totalPages = Math.ceil(cart.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = cart.slice(startIndex, endIndex);

  // Reset to first page when cart changes significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [cart.length, currentPage, totalPages]);

  // Pagination functions
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Drag and Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

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

      if (file.type.startsWith("image/")) {
        processImageFile(file);
      } else {
        toast.error("Harap upload file gambar (PNG, JPG, GIF)");
      }
    }
  };

  const processImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
      setTags([]);
      setCart([]);
      setCurrentPage(1);

      const img = new Image();
      img.onload = () => {
        setImageNaturalSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });

        // Calculate display size with max constraints
        const maxWidth = 800; // Maximum width
        const maxHeight = 600; // Maximum height

        let displayWidth = img.naturalWidth;
        let displayHeight = img.naturalHeight;

        // Scale down if image is too large
        if (displayWidth > maxWidth || displayHeight > maxHeight) {
          const widthRatio = maxWidth / displayWidth;
          const heightRatio = maxHeight / displayHeight;
          const ratio = Math.min(widthRatio, heightRatio);

          displayWidth = displayWidth * ratio;
          displayHeight = displayHeight * ratio;
        }

        setImageDisplaySize({
          width: displayWidth,
          height: displayHeight,
        });

        // Set the image size after it loads
        if (imageRef.current) {
          imageRef.current.style.width = `${displayWidth}px`;
          imageRef.current.style.height = `${displayHeight}px`;
        }
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

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Use the fixed display size instead of current client size
    const percentageX = clickX / imageDisplaySize.width;
    const percentageY = clickY / imageDisplaySize.height;

    const canvasX = percentageX * imageNaturalSize.width;
    const canvasY = percentageY * imageNaturalSize.height;

    const dropdownWidth = 360;
    const dropdownHeight = 480;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let dropdownX = event.clientX;
    let dropdownY = event.clientY;

    if (dropdownX + dropdownWidth > viewportWidth) {
      dropdownX = viewportWidth - dropdownWidth - 10;
    }
    if (dropdownX < 10) {
      dropdownX = 10;
    }

    if (dropdownY + dropdownHeight > viewportHeight) {
      dropdownY = viewportHeight - dropdownHeight - 10;
    }
    if (dropdownY < 10) {
      dropdownY = 10;
    }

    setDropdownPosition({
      x: dropdownX,
      y: dropdownY,
      canvasX: canvasX,
      canvasY: canvasY,
      percentageX: percentageX,
      percentageY: percentageY,
    });
    setSearchQuery("");
    setSelectedItems([]);
    setEditingTag(null);
    setShowDropdown(true);
  };

  // Filter items berdasarkan search query (search by part_name, honda name, or cmw name)
  const filteredItems = databaseItems.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hondaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cmwName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.eqSupplyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.importName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lokalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.makerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle mouse events untuk drag functionality
  const handleMouseDown = (e, tagId, tagIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const tag = tags.find((t) => t.id === tagId);
    if (tag) {
      // Use fixed display size for calculations
      const currentDisplayX = tag.percentageX * imageDisplaySize.width;
      const currentDisplayY = tag.percentageY * imageDisplaySize.height;

      setDraggedTag(tagId);
      setDragOffset({
        x: offsetX - currentDisplayX,
        y: offsetY - currentDisplayY,
      });
      setSelectedTagIndex(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!draggedTag || !imageRef.current) return;

    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const newX = offsetX - dragOffset.x;
    const newY = offsetY - dragOffset.y;

    // Use fixed display size for boundary checks
    const clampedX = Math.max(0, Math.min(newX, imageDisplaySize.width));
    const clampedY = Math.max(0, Math.min(newY, imageDisplaySize.height));

    const newPercentageX = clampedX / imageDisplaySize.width;
    const newPercentageY = clampedY / imageDisplaySize.height;

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

  // New functions for multi-item selection
  const toggleItemSelection = (item) => {
    setSelectedItems((prev) => {
      const isSelected = prev.find((selected) => selected.id === item.id);
      if (isSelected) {
        return prev.filter((selected) => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const createTagWithSelectedItems = () => {
    if (selectedItems.length === 0) return;

    const newTag = {
      id: Date.now(),
      canvasX: dropdownPosition.canvasX,
      canvasY: dropdownPosition.canvasY,
      percentageX: dropdownPosition.percentageX,
      percentageY: dropdownPosition.percentageY,
      items: [...selectedItems], // Array of items instead of single item
    };

    const updatedTags = [...tags, newTag];
    setTags(updatedTags);

    // Recalculate cart with new tags
    recalculateCart(updatedTags);

    setSelectedItems([]);
    setShowDropdown(false);
  };

  const editTag = (tag) => {
    setSelectedItems([...tag.items]);
    setEditingTag(tag.id);
    setDropdownPosition({
      x: window.innerWidth / 2 - 160,
      y: window.innerHeight / 2 - 200,
      canvasX: tag.canvasX,
      canvasY: tag.canvasY,
      percentageX: tag.percentageX,
      percentageY: tag.percentageY,
    });
    setSearchQuery("");
    setShowDropdown(true);
  };

  const updateTag = () => {
    if (selectedItems.length === 0 || !editingTag) return;

    // Update tag with new items
    const updatedTags = tags.map((tag) =>
      tag.id === editingTag ? { ...tag, items: [...selectedItems] } : tag
    );

    setTags(updatedTags);

    // Recalculate cart with updated tags
    recalculateCart(updatedTags);

    setSelectedItems([]);
    setEditingTag(null);
    setShowDropdown(false);
  };

  const removeTag = (tagId) => {
    const updatedTags = tags.filter((tag) => tag.id !== tagId);
    setTags(updatedTags);

    // Recalculate cart after removing tag
    recalculateCart(updatedTags);
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

      ctx.drawImage(img, 0, 0);

      const scaleFactor = Math.min(img.width, img.height) / 500;
      const minScale = 1;
      const maxScale = 8;
      const scale = Math.max(minScale, Math.min(maxScale, scaleFactor));

      tags.forEach((tag, index) => {
        const radius = 15 * scale;
        const strokeWidth = 4 * scale;
        const numberFontSize = Math.max(16 * scale, 16);
        const labelFontSize = Math.max(18 * scale, 14);
        const priceFontSize = Math.max(14 * scale, 12);
        const labelOffset = 25 * scale;
        const padding = 12 * scale;
        const borderRadius = 8 * scale;

        // Draw shadow for tag circle
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

        // Use color from first item or default color
        const tagColor = tag.items[0]?.color || "#3B82F6";

        // Draw tag circle with gradient
        const gradient = ctx.createRadialGradient(
          tag.canvasX - radius * 0.3,
          tag.canvasY - radius * 0.3,
          0,
          tag.canvasX,
          tag.canvasY,
          radius
        );
        gradient.addColorStop(0, tagColor + "FF");
        gradient.addColorStop(1, tagColor + "CC");

        ctx.beginPath();
        ctx.arc(tag.canvasX, tag.canvasY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = strokeWidth;
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.shadowBlur = 6 * scale;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw number
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${numberFontSize}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 3 * scale;
        ctx.shadowOffsetX = 1 * scale;
        ctx.shadowOffsetY = 1 * scale;
        ctx.fillText((index + 1).toString(), tag.canvasX, tag.canvasY);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Create label text for multiple items
        const itemNames = tag.items.map((item) => item.partName).join(", ");
        const labelText =
          tag.items.length > 1
            ? `${tag.items.length} Items: ${
                itemNames.length > 30
                  ? itemNames.substring(0, 30) + "..."
                  : itemNames
              }`
            : tag.items[0].partName;

        const codeText =
          tag.items.length > 1
            ? `Part No: ${tag.items.map((item) => item.partNo).join(", ")}`
            : `Part No: ${tag.items[0].partNo}`;

        // Measure text
        ctx.font = `bold ${labelFontSize}px Arial, sans-serif`;
        const labelWidth = ctx.measureText(labelText).width;
        ctx.font = `${priceFontSize}px Arial, sans-serif`;
        const codeWidth = ctx.measureText(codeText).width;

        const maxTextWidth = Math.max(labelWidth, codeWidth);
        const labelHeight = labelFontSize + priceFontSize + padding * 1.5;

        // Position calculations (same as before)
        const imageDisplayWidth = imageRef.current?.clientWidth || img.width;
        const imageDisplayHeight = imageRef.current?.clientHeight || img.height;

        const displayXInCanvas = tag.percentageX * img.width;
        const displayYInCanvas = tag.percentageY * img.height;

        const wouldExceedRight =
          displayXInCanvas + maxTextWidth + padding * 2 + labelOffset >
          img.width;
        const wouldExceedBottom =
          displayYInCanvas + labelHeight / 2 > img.height;
        const wouldExceedTop = displayYInCanvas - labelHeight / 2 < 0;

        let labelX, labelY, textAlign;

        if (wouldExceedRight) {
          labelX = tag.canvasX - labelOffset;
          textAlign = "right";
        } else {
          labelX = tag.canvasX + labelOffset;
          textAlign = "left";
        }

        if (wouldExceedBottom && !wouldExceedTop) {
          labelY = displayYInCanvas - labelOffset;
        } else if (wouldExceedTop && !wouldExceedBottom) {
          labelY = displayYInCanvas + labelOffset;
        } else {
          labelY = displayYInCanvas;
        }

        let bgX, bgY;
        if (textAlign === "right") {
          bgX = labelX - maxTextWidth - padding * 2;
        } else {
          bgX = labelX - padding;
        }
        bgY = labelY - labelHeight / 2;

        // Draw shadow for background
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

        // Draw background
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

        // Draw text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${labelFontSize}px Arial, sans-serif`;
        ctx.textAlign = textAlign === "right" ? "right" : "left";
        ctx.textBaseline = "top";

        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 2 * scale;
        ctx.shadowOffsetX = 1 * scale;
        ctx.shadowOffsetY = 1 * scale;

        const nameX = textAlign === "right" ? labelX - padding : labelX;
        ctx.fillText(labelText, nameX, bgY + padding);

        ctx.fillStyle = "#FFD700";
        ctx.font = `${priceFontSize}px Arial, sans-serif`;
        ctx.fillText(
          codeText,
          nameX,
          bgY + padding + labelFontSize + 4 * scale
        );

        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });

      const link = document.createElement("a");
      link.download = "tagged-image.png";
      link.href = canvas.toDataURL();
      link.click();
    };

    img.src = uploadedImage;

    toast.success("Your image has been saved to your device");
  }, [uploadedImage, tags]);

  // Handle export form input changes
  const handleExportFormChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setExportFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setExportFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Handle revision data changes
  const handleRevisionChange = (index, field, value) => {
    setExportFormData((prev) => ({
      ...prev,
      revisions: prev.revisions.map((revision, i) =>
        i === index ? { ...revision, [field]: value } : revision
      ),
    }));
  };

  // Show export form
  const showExportFormModal = () => {
    if (cart.length === 0) {
      toast.error("No items to export");
      return;
    }
    setShowExportForm(true);
  };

  const exportToExcel = useCallback(async () => {
    try {
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Supplier Maker Layout");

      // Set column widths
      worksheet.columns = [
        { key: "no", width: 5 }, // A - NO
        { key: "partNoInduk", width: 15 }, // B - PART NO INDUK
        { key: "partNoAnak", width: 15 }, // C - PART NO ANAK
        { key: "partNoChw", width: 15 }, // D - PART NO CHW
        { key: "partName", width: 25 }, // E - PART NAME
        { key: "quantity", width: 8 }, // F - QTY
        { key: "unit", width: 8 }, // G - Unit
        { key: "supplier", width: 12 }, // H - SUPPLIER
        { key: "material", width: 12 }, // I - MATERIAL
        { key: "impor", width: 12 }, // J - IMPOR
        { key: "lokal", width: 12 }, // K - LOKAL
        { key: "partNo", width: 15 }, // L - PART NO
        { key: "maker", width: 15 }, // M - MAKER
        { key: "remark", width: 20 }, // N - REMARK
      ];

      // Company Header
      const companyRow = worksheet.getRow(1);
      companyRow.getCell(1).value = "PT. CIPTA MANDIRI WIRASAKTI";
      companyRow.getCell(1).font = { bold: true, size: 6 };
      worksheet.mergeCells("A1:N1");

      // Title
      const titleRow = worksheet.getRow(2);
      titleRow.getCell(1).value = "SUPPLIER / MAKER LAY OUT";
      titleRow.getCell(1).font = { bold: true, size: 14 };
      titleRow.getCell(1).alignment = { horizontal: "center" };
      worksheet.mergeCells("A2:N2");

      // Project Information Section - using form data
      const projectInfo = [
        ["PART NO.", exportFormData.partNo],
        ["PART NAME", exportFormData.partName],
        ["CUSTOMER", exportFormData.customer],
        ["PROJECT", exportFormData.project],
        ["REVISI / DATE", exportFormData.revisionDate],
      ];

      projectInfo.forEach((info, index) => {
        const row = 3 + index;
        // Merge kolom A dan B
        worksheet.mergeCells(`A${row}:B${row}`);
        worksheet.getCell(`A${row}`).value = info[0];
        worksheet.getCell(`A${row}`).font = { bold: true };
        worksheet.getCell(`A${row}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "E5E7EB" },
        };
        worksheet.getCell(`A${row}`).alignment = {
          vertical: "middle",
          horizontal: "left",
        };

        // Merge kolom C sampai E untuk value info[1]
        worksheet.mergeCells(`C${row}:E${row}`);
        worksheet.getCell(`C${row}`).value = info[1];
        worksheet.getCell(`C${row}`).alignment = {
          vertical: "middle",
          horizontal: "left",
        };

        // Add borders ke kolom A-E
        ["A", "B", "C", "D", "E"].forEach((col) => {
          worksheet.getCell(`${col}${row}`).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Revision table (top right)
      const revisionHeaders = ["REV", "DESCRIPTION", "DATE"];
      const revRow = 3;

      // Header row
      revisionHeaders.forEach((header, index) => {
        const col = index === 0 ? "K" : index === 1 ? "L" : "N";
        worksheet.getCell(`${col}${revRow}`).value = header;
        worksheet.getCell(`${col}${revRow}`).font = { bold: true };
        worksheet.getCell(`${col}${revRow}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "E5E7EB" },
        };
        worksheet.getCell(`${col}${revRow}`).alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        worksheet.getCell(`${col}${revRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Merge DESCRIPTION header L3:M3
      worksheet.mergeCells(`L${revRow}:M${revRow}`);

      // Add revision rows
      for (let i = 1; i <= 4; i++) {
        const row = revRow + i;
        const revisionData = exportFormData.revisions[i - 1];

        // REV cell (K)
        const revCell = worksheet.getCell(`K${row}`);
        revCell.value = revisionData.rev || "";
        revCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        revCell.alignment = { horizontal: "center", vertical: "middle" };

        // DESCRIPTION cells (L:M) merged
        worksheet.mergeCells(`L${row}:M${row}`);
        const descCell = worksheet.getCell(`L${row}`);
        descCell.value = revisionData.description || "";
        descCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        descCell.alignment = { horizontal: "left", vertical: "middle" };

        // DATE cell (N)
        const dateCell = worksheet.getCell(`N${row}`);
        dateCell.value = revisionData.date || "";
        dateCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        dateCell.alignment = { horizontal: "center", vertical: "middle" };
      }

      // Main table header - Row 1
      const tableStartRow = 9;

      // Header Row 1 (Row 9)
      const headerRow1 = worksheet.getRow(tableStartRow);
      headerRow1.values = [
        "NO",
        "PART NO CUST",
        "",
        "PART NO CMW",
        "PART NAME",
        "QTY",
        "UNIT",
        "DWG CUSTOMER",
        "",
        "SUPPLIER",
        "",
        "",
        "",
        "REMARK",
      ];

      // Header Row 2 (Row 10)
      const headerRow2 = worksheet.getRow(tableStartRow + 1);
      headerRow2.values = [
        "",
        "PART NO INDUK",
        "PART NO ANAK",
        "",
        "",
        "",
        "",
        "SUPPLIER",
        "MATERIAL",
        "IMPOR",
        "LOKAL",
        "PART NO",
        "MAKER",
        "",
      ];

      // Merge header sesuai format
      worksheet.mergeCells(`A${tableStartRow}:A${tableStartRow + 1}`);
      worksheet.mergeCells(`B${tableStartRow}:C${tableStartRow}`);
      worksheet.mergeCells(`D${tableStartRow}:D${tableStartRow + 1}`);
      worksheet.mergeCells(`E${tableStartRow}:E${tableStartRow + 1}`);
      worksheet.mergeCells(`F${tableStartRow}:F${tableStartRow + 1}`);
      worksheet.mergeCells(`G${tableStartRow}:G${tableStartRow + 1}`);
      worksheet.mergeCells(`H${tableStartRow}:I${tableStartRow}`);
      worksheet.mergeCells(`J${tableStartRow}:M${tableStartRow}`);
      worksheet.mergeCells(`N${tableStartRow}:N${tableStartRow + 1}`);

      // Style baris 9–10: fill biru
      for (let rowNum = tableStartRow; rowNum <= tableStartRow + 1; rowNum++) {
        for (let colAscii = 65; colAscii <= 78; colAscii++) {
          const col = String.fromCharCode(colAscii);
          const cell = worksheet.getCell(`${col}${rowNum}`);
          cell.font = { bold: true, color: { argb: "FF000000" } }; // hitam
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      }

      // Set tinggi baris 9–10
      [headerRow1, headerRow2].forEach((row) => {
        row.height = 25;
      });

      // Add data rows
      const dataStartRow = tableStartRow + 2;
      cart.forEach((item, index) => {
        const row = worksheet.addRow({
          no: index + 1,
          partNoInduk: item.partNoInduk || item.partNo || "",
          partNoAnak: item.partNoAnak || "",
          partNoChw: item.partNo || "",
          partName: item.partName,
          quantity: item.quantity,
          unit: item.unitName || "PCS",
          supplier: item.supplier || "",
          material: item.materialName || "",
          impor: item.importName || "",
          lokal: item.lokalName || "",
          partNo: item.partNo || "",
          maker: item.makerName || "",
          remark: item.remark || "",
        });

        // Style data rows
        row.alignment = { horizontal: "left", vertical: "middle" };
        row.height = 20;
      });

      // Add borders to all table cells
      const tableEndRow = dataStartRow + cart.length - 1;
      for (let row = tableStartRow; row <= tableEndRow; row++) {
        for (let col = 1; col <= 14; col++) {
          const cell = worksheet.getCell(row, col);
          cell.border = {
            top: { style: "thin", color: { argb: "000000" } },
            left: { style: "thin", color: { argb: "000000" } },
            bottom: { style: "thin", color: { argb: "000000" } },
            right: { style: "thin", color: { argb: "000000" } },
          };
        }
      }

      // Approval section at bottom - using form data
      const approvalStartRow = tableEndRow + 4;
      const approvalHeaders = ["Dibuat", "Diperiksa", "Disetujui"];
      const approvalNames = [
        exportFormData.approvers.dibuat,
        exportFormData.approvers.diperiksa1,
        exportFormData.approvers.diperiksa2,
        exportFormData.approvers.disetujui,
      ];
      const approvalCols = ["K", "L", "M", "N"];

      // Merge kolom L dan M hanya di baris header
      worksheet.mergeCells(`L${approvalStartRow}:M${approvalStartRow}`);

      // Row 1 - Headers (Dibuat, Diperiksa, Disetujui)
      approvalHeaders.forEach((header, index) => {
        // Kolom header: 0 = K, 1 = L, 2 = N
        let col = approvalCols[index === 2 ? 3 : index];
        worksheet.getCell(`${col}${approvalStartRow}`).value = header;
        worksheet.getCell(`${col}${approvalStartRow}`).font = { bold: true };
        worksheet.getCell(`${col}${approvalStartRow}`).alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        worksheet.getCell(`${col}${approvalStartRow}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "E5E7EB" },
        };
        worksheet.getCell(`${col}${approvalStartRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Baris 2 - Signature area (4 kolom: K, L, M, N)
      approvalCols.forEach((col) => {
        const cell = worksheet.getCell(`${col}${approvalStartRow + 1}`);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet.getRow(approvalStartRow + 1).height = 40;

      // Baris 3 - Names (4 kolom: K, L, M, N) - using form data
      approvalNames.forEach((name, index) => {
        const col = approvalCols[index];
        worksheet.getCell(`${col}${approvalStartRow + 2}`).value = name;
        worksheet.getCell(`${col}${approvalStartRow + 2}`).alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        worksheet.getCell(`${col}${approvalStartRow + 2}`).font = {
          bold: true,
        };
        worksheet.getCell(`${col}${approvalStartRow + 2}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create download link
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `supplier-maker-layout-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      link.click();

      // Clean up
      URL.revokeObjectURL(link.href);

      // Close the form
      setShowExportForm(false);
    } catch (error) {
      toast.error("Error exporting to Excel: " + error.message);
    }
  }, [cart, exportFormData]);

  return (
    <div className="h-fit">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Breakdown Drawings
          </h1>
          <p className="text-gray-600">
            Start by uploading an image, tag the items you need, and save the
            final tagged image.
          </p>
        </div>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
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
                    className="rounded-lg shadow-md cursor-crosshair object-contain"
                    onClick={handleImageClick}
                    style={{
                      width: `${imageDisplaySize.width}px`,
                      height: `${imageDisplaySize.height}px`,
                      maxWidth: "none",
                      display: "block",
                    }}
                    onLoad={() => {
                      // Ensure size is maintained after image loads
                      if (imageRef.current && imageDisplaySize.width > 0) {
                        imageRef.current.style.width = `${imageDisplaySize.width}px`;
                        imageRef.current.style.height = `${imageDisplaySize.height}px`;
                      }
                    }}
                  />

                  {/* Render tags */}
                  {tags.map((tag, index) => {
                    // Use fixed display size for tag positioning
                    const currentDisplayX =
                      tag.percentageX * imageDisplaySize.width;
                    const currentDisplayY =
                      tag.percentageY * imageDisplaySize.height;

                    // Position popup calculations (same as before)
                    let popupLeft = "20px";
                    let popupTop = "-20px";
                    let transform = "translateY(-50%)";

                    if (imageRef.current) {
                      const imageRect =
                        imageRef.current.getBoundingClientRect();
                      // Use fixed display size instead of current bounding rect
                      const imageWidth = imageDisplaySize.width;
                      const imageHeight = imageDisplaySize.height;

                      const popupWidth = 250;
                      const popupHeight = 150;

                      const tagAbsoluteX = imageRect.left + currentDisplayX;
                      const tagAbsoluteY = imageRect.top + currentDisplayY;

                      const viewportWidth = window.innerWidth;
                      const viewportHeight = window.innerHeight;

                      const wouldExceedRight =
                        tagAbsoluteX + 20 + popupWidth > viewportWidth;
                      const wouldExceedBottom =
                        tagAbsoluteY + popupHeight / 2 > viewportHeight;
                      const wouldExceedTop = tagAbsoluteY - popupHeight / 2 < 0;
                      const wouldExceedLeft =
                        tagAbsoluteX - 20 - popupWidth < 0;

                      if (wouldExceedRight && !wouldExceedLeft) {
                        popupLeft = `-${popupWidth + 8}px`;
                      } else {
                        popupLeft = "20px";
                      }

                      if (wouldExceedBottom && !wouldExceedTop) {
                        popupTop = `-${popupHeight + 8}px`;
                        transform = "none";
                      } else if (wouldExceedTop && !wouldExceedBottom) {
                        popupTop = "32px";
                        transform = "none";
                      } else {
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
                            backgroundColor: tag.items[0]?.color || "#3B82F6",
                            cursor: draggedTag === tag.id ? "grabbing" : "grab",
                          }}
                          onMouseDown={(e) => handleMouseDown(e, tag.id, index)}
                          onClick={(e) => {
                            e.stopPropagation();
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
                            className="absolute bg-white rounded-lg shadow-xl p-3 border z-10 min-w-60 max-w-72"
                            style={{
                              left: popupLeft,
                              top: popupTop,
                              transform: transform,
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-800 text-sm">
                                {tag.items.length > 1
                                  ? `${tag.items.length} Items`
                                  : tag.items[0]?.partName || "No items"}
                              </h4>
                              <button
                                onClick={() => setSelectedTagIndex(null)}
                                className="text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {/* Show list of items in this tag */}
                            <div className="max-h-32 overflow-y-auto mb-3">
                              {tag.items.map((item, itemIndex) => (
                                <div
                                  key={`tag-item-${item.id}-${itemIndex}`} // Compound key untuk tag items
                                  className="py-2 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-800 truncate">
                                      {item.partName}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 ml-5">
                                    Part No: {item.partNo}
                                  </div>
                                  <div className="text-xs text-gray-500 ml-5">
                                    Part No Induk: {item.hondaName}
                                  </div>
                                  <div className="text-xs text-gray-500 ml-5">
                                    CMW: {item.cmwName}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => editTag(tag)}
                                className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                              >
                                <Tag size={12} />
                                Edit
                              </button>
                              <button
                                onClick={() => removeTag(tag.id)}
                                className="flex-1 bg-red-600 text-white py-1 px-3 rounded text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                              >
                                <X size={12} />
                                Delete
                              </button>
                            </div>
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
                      : "Click to upload or drag and drop an image"}
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
                  Click on the image to add tags with multiple item
                </p>
              </div>
            )}
          </div>

          {/* Cart Section with Full Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <List size={22} />
                Selected Items{" "}
                <span className="text-blue-600">({cart.length})</span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={showExportFormModal}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <FileSpreadsheet size={16} />
                  Export Excel
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-10">
                No spare parts selected yet.
              </p>
            ) : (
              <div className="space-y-5">
                {/* Full Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 rounded-lg text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                          No
                        </th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                          Part Name
                        </th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                          Part No Induk
                        </th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                          Part No CMW
                        </th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((item, itemIndex) => (
                        <tr
                          key={`cart-table-${item.id}-${itemIndex}`}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="border border-gray-200 px-3 py-2 text-gray-600">
                            {startIndex + itemIndex + 1}
                          </td>
                          <td className="border border-gray-200 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 truncate">
                                {item.partName}
                              </span>
                            </div>
                          </td>

                          <td className="border border-gray-200 px-3 py-2 text-gray-600">
                            {item.hondaName}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-gray-600">
                            {item.cmwName}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-gray-600 font-medium">
                            {item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {cart.length > itemsPerPage && (
                  <div className="flex items-center justify-between pt-5 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1}–{Math.min(endIndex, cart.length)}{" "}
                      of {cart.length}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Prev */}
                      <button
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition ${
                          currentPage === 1
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        <ChevronLeft size={16} />
                        Prev
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      {/* Next */}
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition ${
                          currentPage === totalPages
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Export Form Modal */}
        {showExportForm && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: "rgba(75, 85, 99, 0.4)" }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Export to Excel - Document Information
                  </h3>
                  <button
                    onClick={() => setShowExportForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Project Information Section */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-700 mb-4">
                      Project Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Part No <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={exportFormData.partNo}
                          onChange={(e) =>
                            handleExportFormChange("partNo", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter part number"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Part Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={exportFormData.partName}
                          onChange={(e) =>
                            handleExportFormChange("partName", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter part name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Customer <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={exportFormData.customer}
                          onChange={(e) =>
                            handleExportFormChange("customer", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter customer name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Project <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={exportFormData.project}
                          onChange={(e) =>
                            handleExportFormChange("project", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter project name"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Revision Date
                        </label>
                        <input
                          type="text"
                          value={exportFormData.revisionDate}
                          onChange={(e) =>
                            handleExportFormChange(
                              "revisionDate",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="DD/MM/YYYY"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Revision Section */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-700 mb-4">
                      Revision History
                    </h4>
                    <div className="space-y-3">
                      {exportFormData.revisions.map((revision, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Rev {index + 1}
                            </label>
                            <input
                              type="text"
                              value={revision.rev}
                              onChange={(e) =>
                                handleRevisionChange(
                                  index,
                                  "rev",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Rev"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={revision.description}
                              onChange={(e) =>
                                handleRevisionChange(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Description"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Date
                            </label>
                            <input
                              type="text"
                              value={revision.date}
                              onChange={(e) =>
                                handleRevisionChange(
                                  index,
                                  "date",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              placeholder="DD/MM/YYYY"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 mt-2">
                        <span className="font-medium">Note:</span> Last revision
                        (Rev 4) is typically used for "New Release" with current
                        date.
                      </div>
                    </div>
                  </div>

                  {/* Approval Section */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-700 mb-4">
                      Approval Names
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dibuat
                        </label>
                        <input
                          type="text"
                          value={exportFormData.approvers.dibuat}
                          onChange={(e) =>
                            handleExportFormChange(
                              "approvers.dibuat",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Diperiksa 1
                        </label>
                        <input
                          type="text"
                          value={exportFormData.approvers.diperiksa1}
                          onChange={(e) =>
                            handleExportFormChange(
                              "approvers.diperiksa1",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Diperiksa 2
                        </label>
                        <input
                          type="text"
                          value={exportFormData.approvers.diperiksa2}
                          onChange={(e) =>
                            handleExportFormChange(
                              "approvers.diperiksa2",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Disetujui
                        </label>
                        <input
                          type="text"
                          value={exportFormData.approvers.disetujui}
                          onChange={(e) =>
                            handleExportFormChange(
                              "approvers.disetujui",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Export Summary
                    </h4>
                    <p className="text-sm text-gray-600">
                      This will export {cart.length} items to Excel with the
                      information provided above.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowExportForm(false)}
                    className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={exportToExcel}
                    disabled={
                      !exportFormData.partNo ||
                      !exportFormData.partName ||
                      !exportFormData.customer ||
                      !exportFormData.project
                    }
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      !exportFormData.partNo ||
                      !exportFormData.partName ||
                      !exportFormData.customer ||
                      !exportFormData.project
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    <FileSpreadsheet size={16} />
                    Export to Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Item Selection Dropdown */}
        {showDropdown && (
          <div
            className="fixed bg-white rounded-lg shadow-xl border z-50 flex flex-col"
            style={{
              left: `${Math.max(
                10,
                Math.min(dropdownPosition.x, window.innerWidth - 410)
              )}px`,
              top: `${Math.max(
                10,
                Math.min(dropdownPosition.y, window.innerHeight - 530)
              )}px`,
              width: "min(400px, calc(100vw - 20px))",
              height: "min(520px, calc(100vh - 20px))",
            }}
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">
                  {editingTag ? "Edit Tag Items" : "Select Multiple Items"}
                </h3>
                <div className="text-sm text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                  {selectedItems.length} selected
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search parts, honda, cmw..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Selected Items Preview - Fixed Height */}
            {selectedItems.length > 0 && (
              <div className="flex-shrink-0 p-3 bg-blue-50 border-b border-gray-200">
                <div className="text-xs text-blue-700 font-medium mb-2">
                  Selected Items ({selectedItems.length}):
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "80px" }}>
                  <div className="flex flex-wrap gap-1">
                    {selectedItems.map((item, itemIndex) => (
                      <span
                        key={`selected-${item.id}-${itemIndex}`} // Compound key untuk selected items
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex-shrink-0"
                        style={{ maxWidth: "160px" }}
                      >
                        <span className="truncate">{item.partName}</span>
                        <button
                          onClick={() => toggleItemSelection(item)}
                          className="hover:text-blue-600 flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Items List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No spare parts found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, itemIndex) => {
                    const isSelected = selectedItems.find(
                      (selected) => selected.id === item.id
                    );
                    return (
                      <button
                        key={`item-${item.id}-${itemIndex}`} // Compound key untuk memastikan uniqueness
                        onClick={() => toggleItemSelection(item)}
                        className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors ${
                          isSelected
                            ? "bg-blue-100 hover:bg-blue-200 border border-blue-200"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-800 truncate mb-1">
                              {item.partName}
                            </div>
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <div className="truncate">
                                Part No: {item.partNo}
                              </div>
                              <div className="truncate">
                                Part No Induk: {item.hondaName}
                              </div>
                              <div className="truncate">
                                CMW: {item.cmwName}
                              </div>
                              <div className="truncate">
                                Qty: {item.quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 mt-0.5">
                          {isSelected ? (
                            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons - Fixed at Bottom */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedItems([]);
                    setEditingTag(null);
                    setShowDropdown(false);
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTag ? updateTag : createTagWithSelectedItems}
                  disabled={selectedItems.length === 0}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedItems.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  }`}
                >
                  {editingTag
                    ? `Update Tag (${selectedItems.length})`
                    : `Create Tag (${selectedItems.length})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay to close dropdown */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setSelectedItems([]);
              setEditingTag(null);
              setShowDropdown(false);
            }}
          ></div>
        )}
      </div>
    </div>
  );
};

export default ImageTaggingApp;
