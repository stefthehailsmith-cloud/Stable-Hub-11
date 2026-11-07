import React, { useState } from "react";

const currencies = [
  { code: "ZAR", label: "ZAR — South African rand (R)" },
  { code: "USD", label: "USD — US dollar ($)" },
  { code: "GBP", label: "GBP — British pound (£)" },
  { code: "EUR", label: "EUR — euro (€)" },
  { code: "AUD", label: "AUD — Australian dollar ($)" },
];

export default function Settings() {
  const [yardName, setYardName] = useState("Aloe Ridge Equestrian Centre");
  const [country, setCountry] = useState("South Africa");
  const [currency, setCurrency] = useState("ZAR");
  const [saved, setSaved] = useState(false);

  function saveSettings(event) {
    event.preventDefault();

    localStorage.setItem(
      "stableHubSettings",
      JSON.stringify({ yardName, country, currency })
    );

    setSaved(true);
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Yard Settings</h1>
      <p className="mb-6 text-gray-600">
        Set your yard name, country, and preferred currency.
      </p>

      <form onSubmit={saveSettings} className="space-y-5">
        <div>
          <label className="mb-1 block font-medium" htmlFor="yardName">
            Yard name
          </label>
          <input
            id="yardName"
            type="text"
            value={yardName}
            onChange={(event) => {
              setYardName(event.target.value);
              setSaved(false);
            }}
            className="w-full rounded border p-3"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium" htmlFor="country">
            Country
          </label>
          <select
            id="country"
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setSaved(false);
            }}
            className="w-full rounded border p-3"
          >
            <option>South Africa</option>
            <option>United States</option>
            <option>United Kingdom</option>
            <option>Ireland</option>
            <option>Australia</option>
            <option>New Zealand</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-medium" htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setSaved(false);
            }}
            className="w-full rounded border p-3"
          >
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded bg-green-700 px-5 py-3 font-medium text-white"
        >
          Save settings
        </button>

        {saved && (
          <p className="font-medium text-green-700">Settings saved.</p>
        )}
      </form>
    </main>
  );
}