import React from "react";

interface PaymentsProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function Payments({ onLogout, onNavigate }: PaymentsProps) {
  const transactions = [
    {
      invoiceId: "#1345678",
      title: "Success Fee",
      payment: "14.625% of the total amount..",
      status: "pending",
      showPayButton: true,
    },
    {
      invoiceId: "#1345678",
      title: "Fee to Open the Case",
      payment: "650 NIS",
      status: "paid",
      showPayButton: false,
    },
  ];

  const badgeStyles = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-800";
      case "paid":
        return "bg-green-50 text-green-800";
      default:
        return "bg-gray-50 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      <div className="flex">

        {/* Main */}
        <main className="flex-1 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-semibold">Payments</h1>
          </div>

          <div className="bg-white border rounded p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Congratulations</strong> you have received <strong>$30,000</strong> and you
              will receive <strong>$20,000</strong> till Oct 31, 2024.
            </p>
          </div>

          {/* Table header (hidden on small screens) */}
          <div className="shadow-md hidden md:grid grid-cols-12 gap-4 items-center px-4 py-3 text-sm font-medium text-gray-600 bg-white border rounded-t">
            <div className="col-span-2">Invoice ID</div>
            <div className="col-span-6">Title</div>
            <div className="col-span-2 text-right">Payment</div>
            <div className="col-span-2 text-center">Status / Action</div>
          </div>

          {/* Rows */}
          <div className="space-y-3 mt-2">
            {transactions.map((t, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white border rounded p-4">
                <div className="md:col-span-2">
                  <div className="text-sm font-medium">{t.invoiceId}</div>
                </div>

                <div className="md:col-span-6">
                  <div className="text-sm font-semibold">{t.title}</div>
                  <div className="text-xs text-gray-500 mt-1 sm:mt-0">{t.payment}</div>
                </div>

                <div className="md:col-span-2 text-right text-sm text-gray-600">
                  <div className="whitespace-nowrap">{t.payment}</div>
                </div>

                <div className="md:col-span-2 flex flex-col md:flex-row md:items-center md:justify-center gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${badgeStyles(t.status)}`}>
                    {t.status === "paid" ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="6" />
                      </svg>
                    )}
                    <span className="capitalize">{t.status}</span>
                  </div>

                  {t.status === "pending" && t.showPayButton && (
                    <button
                      type="button"
                      className="px-3 py-1 border rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                      onClick={() => alert(`Pay ${t.invoiceId}`)}
                    >
                      Pay
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
