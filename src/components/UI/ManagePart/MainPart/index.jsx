"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  AlertTriangle,
  Eye,
} from "lucide-react";
import supabase from "@/app/utils/db";

// AutoComplete Input Component
const AutoCompleteInput = ({
  value,
  onChange,
  options,
  placeholder,
  className,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isManualInput, setIsManualInput] = useState(false);

  useEffect(() => {
    // Set initial input value based on prop value
    if (value && !isManualInput) {
      const existingOption = options.find(
        (opt) =>
          opt.id_honda == value ||
          opt.id_cmw == value ||
          opt.id_unit == value ||
          opt.id_eq_supply_1 == value ||
          opt.id_material == value ||
          opt.id_import == value ||
          opt.id_lokal == value ||
          opt.id_maker == value
      );
      setInputValue(existingOption ? existingOption.nama : value);
    } else if (!value) {
      setInputValue("");
      setIsManualInput(false);
    }
  }, [value, options, isManualInput]);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = options.filter((option) =>
        option.nama.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions([]);
    }
  }, [inputValue, options]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowDropdown(true);
    setIsManualInput(true);

    // Only auto-select if it's an exact match
    const exactMatch = options.find(
      (opt) => opt.nama.toLowerCase() === newValue.toLowerCase()
    );

    if (exactMatch && newValue.length > 0) {
      const idField = Object.keys(exactMatch).find((key) =>
        key.startsWith("id_")
      );
      onChange(exactMatch[idField]);
    } else {
      // Pass the string value for new entries or partial matches
      onChange(newValue);
    }
  };

  const handleOptionSelect = (option) => {
    setInputValue(option.nama);
    setShowDropdown(false);
    setIsManualInput(false);
    const idField = Object.keys(option).find((key) => key.startsWith("id_"));
    onChange(option[idField]);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
    setIsManualInput(true);
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow for option selection
    setTimeout(() => {
      setShowDropdown(false);
      setIsManualInput(false);
    }, 200);
  };

  const handleInputKeyDown = (e) => {
    // Handle Escape key to close dropdown
    if (e.key === "Escape") {
      setShowDropdown(false);
      setIsManualInput(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((option) => {
                const idField = Object.keys(option).find((key) =>
                  key.startsWith("id_")
                );
                return (
                  <div
                    key={option[idField]}
                    onMouseDown={() => handleOptionSelect(option)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {option.nama}
                  </div>
                );
              })}
              {inputValue &&
                !filteredOptions.some(
                  (opt) => opt.nama.toLowerCase() === inputValue.toLowerCase()
                ) && (
                  <div className="px-3 py-2 text-sm text-gray-600 border-t border-gray-200">
                    <span className="font-medium">Add new:</span> "{inputValue}"
                  </div>
                )}
            </>
          ) : inputValue.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-600">
              <span className="font-medium">Add new:</span> "{inputValue}"
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Start typing to see options...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
const Modal = ({ isOpen, onClose, title, children, size = "max-w-md" }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto"
      style={{ backgroundColor: "rgba(75, 85, 99, 0.4)" }}
    >
      <div className={`bg-white rounded-lg shadow-xl ${size} w-full mx-4 my-8`}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const MainPart = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reference data for dropdowns
  const [hondaOptions, setHondaOptions] = useState([]);
  const [cmwOptions, setCmwOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [eqSupplyOptions, setEqSupplyOptions] = useState([]);
  const [materialOptions, setMaterialOptions] = useState([]);
  const [importOptions, setImportOptions] = useState([]);
  const [lokalOptions, setLokalOptions] = useState([]);
  const [makerOptions, setMakerOptions] = useState([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    part_name: "",
    part_no: "",
    id_honda: "",
    id_cmw: "",
    id_unit: "",
    id_eq_supply_1: "",
    id_material: "",
    id_import: "",
    id_lokal: "",
    id_maker: "",
  });

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [
        { data: honda },
        { data: cmw },
        { data: unit },
        { data: eq_supply },
        { data: material },
        { data: import_data },
        { data: lokal },
        { data: maker },
      ] = await Promise.all([
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

      setHondaOptions(honda || []);
      setCmwOptions(cmw || []);
      setUnitOptions(unit || []);
      setEqSupplyOptions(eq_supply || []);
      setMaterialOptions(material || []);
      setImportOptions(import_data || []);
      setLokalOptions(lokal || []);
      setMakerOptions(maker || []);
    } catch (error) {
      console.error("Error fetching reference data:", error);
    }
  };

  const fetchMainPart = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("main_part")
        .select(
          `
          id_main_part,
          part_name,
          part_no,
          id_honda,
          id_cmw,
          id_unit,
          id_eq_supply_1,
          id_material,
          id_import,
          id_lokal,
          id_maker,
          honda:id_honda(nama),
          cmw:id_cmw(nama),
          unit:id_unit(nama),
          eq_supply_1:id_eq_supply_1(nama),
          material:id_material(nama),
          import:id_import(nama),
          lokal:id_lokal(nama),
          maker:id_maker(nama)
        `
        )
        .order("part_name");

      if (error) throw error;

      const mainPartData = data.map((row) => ({
        id: row.id_main_part,
        part_name: row.part_name,
        part_no: row.part_no,
        id_honda: row.id_honda,
        id_cmw: row.id_cmw,
        id_unit: row.id_unit,
        id_eq_supply_1: row.id_eq_supply_1,
        id_material: row.id_material,
        id_import: row.id_import,
        id_lokal: row.id_lokal,
        id_maker: row.id_maker,
        honda_name: row.honda?.nama || "-",
        cmw_name: row.cmw?.nama || "-",
        unit_name: row.unit?.nama || "-",
        eq_supply_name: row.eq_supply_1?.nama || "-",
        material_name: row.material?.nama || "-",
        import_name: row.import?.nama || "-",
        lokal_name: row.lokal?.nama || "-",
        maker_name: row.maker?.nama || "-",
      }));

      setAllData(mainPartData);
    } catch (error) {
      console.error("Error fetching data: ", error);
      alert("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
    fetchMainPart();
  }, []);

  // State untuk search, pagination, dan sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    field: "part_name",
    order: "asc",
  });

  // Filter dan sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = allData;

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.part_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.honda_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.maker_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort data
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.field] || "";
      const bValue = b[sortConfig.field] || "";

      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      if (sortConfig.order === "asc") {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });

    return filtered;
  }, [allData, searchTerm, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  // Sort handler
  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortConfig.order === "asc" ? (
      <ChevronUp size={14} className="text-blue-600" />
    ) : (
      <ChevronDown size={14} className="text-blue-600" />
    );
  };

  // Modal handlers
  const openAddModal = () => {
    setFormData({
      part_name: "",
      part_no: "",
      id_honda: "",
      id_cmw: "",
      id_unit: "",
      id_eq_supply_1: "",
      id_material: "",
      id_import: "",
      id_lokal: "",
      id_maker: "",
    });
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      part_name: item.part_name,
      part_no: item.part_no,
      id_honda: item.id_honda || "",
      id_cmw: item.id_cmw || "",
      id_unit: item.id_unit || "",
      id_eq_supply_1: item.id_eq_supply_1 || "",
      id_material: item.id_material || "",
      id_import: item.id_import || "",
      id_lokal: item.id_lokal || "",
      id_maker: item.id_maker || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const closeAllModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowDetailModal(false);
    setSelectedItem(null);
    setFormData({
      part_name: "",
      part_no: "",
      id_honda: "",
      id_cmw: "",
      id_unit: "",
      id_eq_supply_1: "",
      id_material: "",
      id_import: "",
      id_lokal: "",
      id_maker: "",
    });
  };

  // CRUD Operations
  const handleAdd = async () => {
    await handleFormSubmit(true);
  };

  const handleEdit = async () => {
    await handleFormSubmit(false);
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("main_part")
        .delete()
        .eq("id_main_part", selectedItem.id);

      if (error) throw error;

      await fetchMainPart();
      closeAllModals();
      alert("Data successfully deleted!");
    } catch (error) {
      console.error("Error deleting data: ", error);
      alert("Error deleting data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Handler untuk mengupdate formData - menggunakan useCallback untuk mencegah re-render
  const handleFormDataChange = React.useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Function to insert new reference data
  const insertNewReferenceData = async (tableName, nama) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ nama: nama.trim() }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error inserting new ${tableName}:`, error);
      throw error;
    }
  };

  // Function to handle form submission with auto-insert for new reference data
  const handleFormSubmit = async (isAdd = true) => {
    if (!formData.part_name.trim() || !formData.part_no.trim()) {
      alert("Part name and part no are required!");
      return;
    }

    try {
      setLoading(true);

      // Prepare data for insertion/update
      let processedData = {
        part_name: formData.part_name.trim(),
        part_no: formData.part_no.trim(),
        id_honda: null,
        id_cmw: null,
        id_unit: null,
        id_eq_supply_1: null,
        id_material: null,
        id_import: null,
        id_lokal: null,
        id_maker: null,
      };

      // Helper function to process reference data
      const processReferenceData = async (value, options, tableName) => {
        if (!value) return null;

        // Check if value is numeric (existing ID)
        if (!isNaN(value) && !isNaN(parseFloat(value))) {
          const numericValue = parseInt(value);
          const existingById = options.find((opt) => {
            const idField = Object.keys(opt).find((key) =>
              key.startsWith("id_")
            );
            return opt[idField] === numericValue;
          });
          if (existingById) {
            return numericValue;
          }
        }

        // Check if value is string (name)
        const valueStr = String(value).trim();
        const existingByName = options.find(
          (opt) => opt.nama.toLowerCase() === valueStr.toLowerCase()
        );

        if (existingByName) {
          const idField = Object.keys(existingByName).find((key) =>
            key.startsWith("id_")
          );
          return existingByName[idField];
        } else {
          // Insert new data
          const newData = await insertNewReferenceData(tableName, valueStr);
          const idField = Object.keys(newData).find((key) =>
            key.startsWith("id_")
          );

          // Update corresponding options state
          switch (tableName) {
            case "honda":
              setHondaOptions((prev) => [...prev, newData]);
              break;
            case "cmw":
              setCmwOptions((prev) => [...prev, newData]);
              break;
            case "unit":
              setUnitOptions((prev) => [...prev, newData]);
              break;
            case "eq_supply_1":
              setEqSupplyOptions((prev) => [...prev, newData]);
              break;
            case "material":
              setMaterialOptions((prev) => [...prev, newData]);
              break;
            case "import":
              setImportOptions((prev) => [...prev, newData]);
              break;
            case "lokal":
              setLokalOptions((prev) => [...prev, newData]);
              break;
            case "maker":
              setMakerOptions((prev) => [...prev, newData]);
              break;
          }

          return newData[idField];
        }
      };

      // Process each reference field
      processedData.id_honda = await processReferenceData(
        formData.id_honda,
        hondaOptions,
        "honda"
      );
      processedData.id_cmw = await processReferenceData(
        formData.id_cmw,
        cmwOptions,
        "cmw"
      );
      processedData.id_unit = await processReferenceData(
        formData.id_unit,
        unitOptions,
        "unit"
      );
      processedData.id_eq_supply_1 = await processReferenceData(
        formData.id_eq_supply_1,
        eqSupplyOptions,
        "eq_supply_1"
      );
      processedData.id_material = await processReferenceData(
        formData.id_material,
        materialOptions,
        "material"
      );
      processedData.id_import = await processReferenceData(
        formData.id_import,
        importOptions,
        "import"
      );
      processedData.id_lokal = await processReferenceData(
        formData.id_lokal,
        lokalOptions,
        "lokal"
      );
      processedData.id_maker = await processReferenceData(
        formData.id_maker,
        makerOptions,
        "maker"
      );

      // Insert or update main part data
      if (isAdd) {
        const { error } = await supabase
          .from("main_part")
          .insert([processedData]);
        if (error) throw error;
        alert("Data successfully added!");
      } else {
        const { error } = await supabase
          .from("main_part")
          .update(processedData)
          .eq("id_main_part", selectedItem.id);
        if (error) throw error;
        alert("Data successfully updated!");
      }

      await fetchMainPart();
      closeAllModals();
    } catch (error) {
      console.error("Error saving data: ", error);
      alert("Error saving data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-gray-50 h-fit overflow-y-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Main Part</h2>
              <span className="text-sm text-gray-500">
                {filteredAndSortedData.length} Items
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Add button */}
              <button
                onClick={openAddModal}
                disabled={loading}
                title="Add New Item"
                className="flex items-center gap-1 py-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-150"
              >
                <Plus size={16} />
                Add
              </button>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search part name, part no, honda, maker..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 w-80"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("part_name")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Part Name</span>
                    {getSortIcon("part_name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("honda_name")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Part No Induk</span>
                    {getSortIcon("honda_name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("part_no")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Part No</span>
                    {getSortIcon("part_no")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("maker_name")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Maker</span>
                    {getSortIcon("maker_name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((item, index) => {
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="truncate max-w-xs" title={item.part_name}>
                        {item.part_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div
                        className="truncate max-w-xs"
                        title={item.honda_name}
                      >
                        {item.honda_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.part_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div
                        className="truncate max-w-xs"
                        title={item.maker_name}
                      >
                        {item.maker_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-start space-x-2">
                        {/* View Detail Button */}
                        <button
                          onClick={() => openDetailModal(item)}
                          className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-150"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(item)}
                          disabled={loading}
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 disabled:opacity-50 rounded-full transition-all duration-150"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => openDeleteModal(item)}
                          disabled={loading}
                          className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-50 rounded-full transition-all duration-150"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-blue-600">
              <svg
                className="animate-spin h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          </div>
        )}

        {/* Empty State */}
        {currentData.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              {searchTerm ? "No matching results found" : "No data available"}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm
                ? `Try adjusting your search term "${searchTerm}"`
                : "Data will appear here after being added."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredAndSortedData.length > 0 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {/* Items per page selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Pagination info and controls */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {startIndex + 1}-
                  {Math.min(endIndex, filteredAndSortedData.length)} of{" "}
                  {filteredAndSortedData.length}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={closeAllModals}
        title={showAddModal ? "Add New Main Part" : "Edit Main Part"}
        size="max-w-2xl"
      >
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Part Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.part_name}
                onChange={(e) =>
                  handleFormDataChange("part_name", e.target.value)
                }
                placeholder="Enter part name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Part No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.part_no}
                onChange={(e) =>
                  handleFormDataChange("part_no", e.target.value)
                }
                placeholder="Enter part no..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              />
            </div>

            {/* Honda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part No Induk
              </label>
              <AutoCompleteInput
                value={formData.id_honda}
                onChange={(value) => handleFormDataChange("id_honda", value)}
                options={hondaOptions}
                placeholder="Select or type Part No Induk..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              />
            </div>

            {/* CMW */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CMW
              </label>
              <AutoCompleteInput
                value={formData.id_cmw}
                onChange={(value) => handleFormDataChange("id_cmw", value)}
                options={cmwOptions}
                placeholder="Select or type CMW..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <AutoCompleteInput
                value={formData.id_unit}
                onChange={(value) => handleFormDataChange("id_unit", value)}
                options={unitOptions}
                placeholder="Select or type Unit..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Supply */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supply
              </label>
              <AutoCompleteInput
                value={formData.id_eq_supply_1}
                onChange={(value) =>
                  handleFormDataChange("id_eq_supply_1", value)
                }
                options={eqSupplyOptions}
                placeholder="Select or type Supply..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material
              </label>
              <AutoCompleteInput
                value={formData.id_material}
                onChange={(value) => handleFormDataChange("id_material", value)}
                options={materialOptions}
                placeholder="Select or type Material..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Import */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import
              </label>
              <AutoCompleteInput
                value={formData.id_import}
                onChange={(value) => handleFormDataChange("id_import", value)}
                options={importOptions}
                placeholder="Select or type Import..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Lokal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lokal
              </label>
              <AutoCompleteInput
                value={formData.id_lokal}
                onChange={(value) => handleFormDataChange("id_lokal", value)}
                options={lokalOptions}
                placeholder="Select or type Lokal..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Maker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maker
              </label>
              <AutoCompleteInput
                value={formData.id_maker}
                onChange={(value) => handleFormDataChange("id_maker", value)}
                options={makerOptions}
                placeholder="Select or type Maker..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeAllModals}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={showAddModal ? handleAdd : handleEdit}
              disabled={
                loading ||
                !formData.part_name.trim() ||
                !formData.part_no.trim()
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading
                ? showAddModal
                  ? "Saving..."
                  : "Updating..."
                : showAddModal
                ? "Save"
                : "Update"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeAllModals}
        title="Main Part Details"
        size="max-w-2xl"
      >
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-500">Part Name</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.part_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Part No</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.part_no}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">
                Part No Induk
              </h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.honda_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">CMW</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.cmw_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Unit</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.unit_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Supply</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.eq_supply_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Material</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.material_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Import</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.import_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Lokal</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.lokal_name}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Maker</h4>
              <p className="mt-1 text-sm text-gray-900">
                {selectedItem?.maker_name}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={closeAllModals}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={closeAllModals}
        title="Delete Confirmation"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-center mb-6">
            <p className="text-gray-700">
              Are you sure you want to delete the part{" "}
              <span className="font-semibold">"{selectedItem?.part_name}"</span>
              ?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-center space-x-3">
            <button
              onClick={closeAllModals}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MainPart;
