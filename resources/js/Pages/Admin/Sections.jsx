import React, { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useForm, usePage } from "@inertiajs/react";
import { Pencil, Trash2, Save, X } from "lucide-react";
import Swal from "sweetalert2";

export default function Sections() {
  const { sections, gradeLevels } = usePage().props;
  const { data, setData, post, processing, reset } = useForm({
    name: "",
    grade_level_id: "",
  });
  const [editingId, setEditingId] = useState(null);

  // SweetAlert Toast
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });

  // Add new section with confirmation
  const handleSubmit = (e) => {
    e.preventDefault();

    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to add this section?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, add it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        post("/admin/section/store", {
          data,
          onSuccess: () => {
            reset();
            Toast.fire({
              icon: "success",
              title: "Section added successfully!",
            });
          },
          onError: () => {
            Swal.fire("Error", "Failed to add section.", "error");
          },
        });
      }
    });
  };

  // Update section
  const handleUpdate = (id) => {
    post(`/admin/section/update/${id}`, {
      _method: "PUT",
      name: data.name,
      grade_level_id: data.grade_level_id,
      onSuccess: () => {
        setEditingId(null);
        Toast.fire({
          icon: "success",
          title: "Section updated successfully!",
        });
      },
      onError: () => {
        Swal.fire("Error", "Failed to update section.", "error");
      },
    });
  };

  // Delete section with confirmation
  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This section will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`/admin/section/delete/${id}`, {
          method: "DELETE",
          headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')
              .content,
          },
        }).then(() => {
          Swal.fire("Deleted!", "Section has been deleted.", "success").then(
            () => window.location.reload()
          );
        });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-6xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-8 flex items-center gap-2">
          🏫 Manage Sections
        </h1>

        {/* Add Section */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-10 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            ➕ Add New Section
          </h2>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4"
          >
            <input
              type="text"
              placeholder="Section Name"
              value={data.name}
              onChange={(e) => setData("name", e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={data.grade_level_id}
              onChange={(e) => setData("grade_level_id", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select Grade Level</option>
              {gradeLevels.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  Grade {grade.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={processing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg shadow-md hover:scale-105 transform transition"
            >
              Add Section
            </button>
          </form>
        </div>

        {/* Sections Table */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Section Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Grade Level
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.map((section, idx) => (
                <tr
                  key={section.id}
                  className={`${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-blue-50 transition`}
                >
                  {/* Section Name */}
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {editingId === section.id ? (
                      <input
                        type="text"
                        defaultValue={section.name}
                        onChange={(e) => setData("name", e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                      />
                    ) : (
                      <span className="font-medium">{section.name}</span>
                    )}
                  </td>

                  {/* Grade Level */}
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {editingId === section.id ? (
                      <select
                        defaultValue={section.grade_level_id}
                        onChange={(e) =>
                          setData("grade_level_id", e.target.value)
                        }
                        className="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {gradeLevels.map((grade) => (
                          <option key={grade.id} value={grade.id}>
                            Grade {grade.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-700">
                        Grade {section.grade_level?.name || "N/A"}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 flex justify-center gap-2">
                    {editingId === section.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(section.id)}
                          className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                        >
                          <Save className="w-4 h-4" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 bg-gray-400 text-white px-3 py-1 rounded-lg hover:bg-gray-500 transition"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingId(section.id)}
                          className="flex items-center gap-1 bg-yellow-400 text-white px-3 py-1 rounded-lg hover:bg-yellow-500 transition"
                        >
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(section.id)}
                          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {sections.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-6 text-center text-gray-400 italic"
                  >
                    No sections found. Add a new one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
