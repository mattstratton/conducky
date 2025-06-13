import React from "react";

interface ReportMetaTableProps {
  id: string;
  type: string;
  description: string;
  reporter?: { name?: string; email?: string } | null;
}

export function ReportMetaTable({ id, type, description, reporter }: ReportMetaTableProps) {
  return (
    <table className="w-full border-collapse mb-4">
      <tbody>
        <tr>
          <td className="font-bold w-32">ID</td>
          <td>{id}</td>
        </tr>
        <tr>
          <td className="font-bold">Type</td>
          <td>{type}</td>
        </tr>
        <tr>
          <td className="font-bold">Description</td>
          <td>{description}</td>
        </tr>
        <tr>
          <td className="font-bold">Reporter</td>
          <td>{reporter ? (reporter.name || reporter.email || 'Anonymous') : 'Anonymous'}</td>
        </tr>
      </tbody>
    </table>
  );
} 