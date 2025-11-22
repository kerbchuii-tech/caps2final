import { usePage } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useState } from "react";
import {
  FileText,
  Folder,
  Users,
  DollarSign,
  Gift,
} from "lucide-react";

export default function Archives() {
  const { archivesData = [] } = usePage().props;
  const [activeTab, setActiveTab] = useState(null);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value || 0);

  return (
    <AdminLayout>
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-extrabold text-[#2563eb] flex items-center gap-2">
            <FileText className="text-[#2563eb]" size={28} />
            Archived School Years
          </h1>
        </div>

        {archivesData.length === 0 ? (
          <p className="text-gray-500 italic text-lg">
            No archived school years found.
          </p>
        ) : (
          archivesData.map((year) => {
            const tabs = [
              { id: "students", label: "Students", icon: Users },
              { id: "payments", label: "Payments", icon: DollarSign },
              { id: "donations", label: "Donations", icon: Gift },
            ];

            return (
              <div
                key={year.school_year.id}
                className="border rounded-xl shadow bg-white"
              >
                {/* Year Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                  <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                    <Folder className="text-indigo-600" size={20} />
                    {year.school_year.name}
                  </h2>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 border-b px-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setActiveTab(
                          activeTab === `${year.school_year.id}-${tab.id}`
                            ? null
                            : `${year.school_year.id}-${tab.id}`
                        )
                      }
                      className={`px-4 py-2 font-medium flex items-center gap-1 border-b-2 transition-colors ${
                        activeTab === `${year.school_year.id}-${tab.id}`
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-blue-500"
                      }`}
                    >
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Students */}
                  {activeTab === `${year.school_year.id}-students` && (
                    <div className="overflow-x-auto">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Students
                      </h3>
                      {year.students.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                          No students
                        </p>
                      ) : (
                        <table className="w-full text-sm text-gray-700 border-collapse">
                          <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                              <th className="px-5 py-3 text-left">First Name</th>
                              <th className="px-5 py-3 text-left">Last Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {year.students.map((s) => (
                              <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3">{s.first_name}</td>
                                <td className="px-5 py-3">{s.last_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Payments */}
                  {activeTab === `${year.school_year.id}-payments` && (
                    <div className="overflow-x-auto">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Payments
                      </h3>
                      {year.payments.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                          No payments
                        </p>
                      ) : (
                        <table className="w-full text-sm text-gray-700 border-collapse">
                          <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                              <th className="px-5 py-3 text-left">Student</th>
                              <th className="px-5 py-3 text-right">Amount</th>
                              <th className="px-5 py-3 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {year.payments.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3">
                                  {p.student
                                    ? `${p.student.first_name} ${p.student.last_name}`
                                    : "Unknown Student"}
                                </td>
                                <td className="px-5 py-3 text-right font-medium text-blue-700">
                                  {formatCurrency(p.amount_paid)}
                                </td>
                                <td className="px-5 py-3">
                                  {new Date(
                                    p.payment_date
                                  ).toLocaleDateString("en-US")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Donations */}
                  {activeTab === `${year.school_year.id}-donations` && (
                    <div className="overflow-x-auto">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Donations
                      </h3>
                      {year.donations.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                          No donations
                        </p>
                      ) : (
                        <table className="w-full text-sm text-gray-700 border-collapse">
                          <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                            <tr>
                              <th className="px-5 py-3 text-left">Donor</th>
                              <th className="px-5 py-3 text-right">Amount</th>
                              <th className="px-5 py-3 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {year.donations.map((d) => (
                              <tr key={d.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3">{d.donated_by}</td>
                                <td className="px-5 py-3 text-right font-medium text-purple-700">
                                  {formatCurrency(d.donation_amount)}
                                </td>
                                <td className="px-5 py-3">
                                  {new Date(
                                    d.donation_date
                                  ).toLocaleDateString("en-US")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
