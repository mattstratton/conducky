import React, { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PencilIcon, CheckIcon, XMarkIcon, LinkIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";

export interface EventMeta {
  name: string;
  logo?: string;
  startDate?: string;
  endDate?: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  codeOfConduct?: string;
}

interface EventMetaEditorProps {
  event: EventMeta;
  eventSlug: string;
  onMetaChange: (field: keyof EventMeta, value: string | File | null) => void;
  onMetaSave: (field: keyof EventMeta, value: string | File | null) => Promise<void>;
  metaEditError?: string;
  metaEditSuccess?: string;
  logoExists?: boolean;
  logoPreview?: string | null;
  logoUploadLoading?: boolean;
}

export function EventMetaEditor({
  event,
  eventSlug,
  onMetaChange,
  onMetaSave,
  metaEditError,
  metaEditSuccess,
  logoExists,
  logoPreview,
  logoUploadLoading,
}: EventMetaEditorProps) {
  const [editingField, setEditingField] = useState<keyof EventMeta | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [showCodeSheet, setShowCodeSheet] = useState(false);

  const backendBaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || "http://localhost:4000";
  const logoSrc = logoPreview || (logoExists ? `${backendBaseUrl}/events/slug/${eventSlug}/logo` : null);

  const startEdit = (field: keyof EventMeta, value: string) => {
    setEditingField(field);
    setEditValue(value || "");
    if (field === "logo") setLogoFile(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
    setLogoFile(null);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    if (editingField === "logo" && logoFile) {
      await onMetaSave("logo", logoFile);
    } else {
      await onMetaSave(editingField, editValue);
    }
    setEditingField(null);
    setEditValue("");
    setLogoFile(null);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      onMetaChange("logo", file);
    }
  };

  const copyCodeOfConductLink = async () => {
    const url = `${window.location.origin}/event/${eventSlug}/code-of-conduct`;
    try {
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const openCodeOfConductPage = () => {
    const url = `/event/${eventSlug}/code-of-conduct`;
    window.open(url, '_blank');
  };

  return (
    <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Name:</span>
          {editingField === "name" ? (
            <>
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-64"
              />
              <Button onClick={saveEdit} className="text-green-600" aria-label="Save name"><CheckIcon className="h-5 w-5" /></Button>
              <Button onClick={cancelEdit} className="text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></Button>
            </>
          ) : (
            <>
              <span>{event.name}</span>
              <Button onClick={() => startEdit("name", event.name)} className="text-blue-600" aria-label="Edit name"><PencilIcon className="h-5 w-5" /></Button>
            </>
          )}
        </div>
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Logo:</span>
          {logoSrc && <img src={logoSrc} alt="Event Logo" className="w-16 h-16 object-contain rounded bg-white border border-gray-200 dark:border-gray-700" />}
          {editingField === "logo" ? (
            <div className="flex flex-col gap-1">
              <input type="file" accept="image/*" onChange={handleLogoFileChange} />
              <span className="text-xs text-gray-500 dark:text-gray-400">or</span>
              <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-64" placeholder="Logo URL" disabled={!!logoFile} />
              <div className="flex gap-1 mt-2">
                <Button onClick={saveEdit} className="text-green-600" aria-label="Save logo" disabled={logoUploadLoading}><CheckIcon className="h-5 w-5" /></Button>
                <Button onClick={cancelEdit} className="text-gray-500" aria-label="Cancel edit" disabled={logoUploadLoading}><XMarkIcon className="h-5 w-5" /></Button>
              </div>
              {logoUploadLoading && <span className="text-xs text-gray-500 mt-1">Uploading...</span>}
            </div>
          ) : (
            <>
              <span className="ml-2 text-gray-700 dark:text-gray-200">{event.logo || <span className="italic text-gray-400">(none)</span>}</span>
              <Button onClick={() => startEdit("logo", event.logo || "")} className="text-blue-600" aria-label="Edit logo"><PencilIcon className="h-5 w-5" /></Button>
            </>
          )}
        </div>
        {/* Start Date */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Start Date:</span>
          {editingField === "startDate" ? (
            <>
              <Input type="date" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-48" />
              <Button onClick={saveEdit} className="text-green-600" aria-label="Save start date"><CheckIcon className="h-5 w-5" /></Button>
              <Button onClick={cancelEdit} className="text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></Button>
            </>
          ) : (
            <>
              <span className="ml-2 text-gray-700 dark:text-gray-200">{event.startDate ? new Date(event.startDate).toLocaleDateString() : <span className="italic text-gray-400">(none)</span>}</span>
              <Button onClick={() => startEdit("startDate", event.startDate || "")} className="text-blue-600" aria-label="Edit start date"><PencilIcon className="h-5 w-5" /></Button>
            </>
          )}
        </div>
        {/* End Date */}
        <div className="flex items-center gap-2">
          <span className="font-medium">End Date:</span>
          {editingField === "endDate" ? (
            <>
              <Input type="date" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-48" />
              <Button onClick={saveEdit} className="text-green-600" aria-label="Save end date"><CheckIcon className="h-5 w-5" /></Button>
              <Button onClick={cancelEdit} className="text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></Button>
            </>
          ) : (
            <>
              <span className="ml-2 text-gray-700 dark:text-gray-200">{event.endDate ? new Date(event.endDate).toLocaleDateString() : <span className="italic text-gray-400">(none)</span>}</span>
              <Button onClick={() => startEdit("endDate", event.endDate || "")} className="text-blue-600" aria-label="Edit end date"><PencilIcon className="h-5 w-5" /></Button>
            </>
          )}
        </div>
        {/* Website */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Website:</span>
          {editingField === "website" ? (
            <>
              <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-64" />
              <Button onClick={saveEdit} className="text-green-600" aria-label="Save website"><CheckIcon className="h-5 w-5" /></Button>
              <Button onClick={cancelEdit} className="text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></Button>
            </>
          ) : (
            <>
              <span className="ml-2 text-gray-700 dark:text-gray-200">{event.website || <span className="italic text-gray-400">(none)</span>}</span>
              <Button onClick={() => startEdit("website", event.website || "")} className="text-blue-600" aria-label="Edit website"><PencilIcon className="h-5 w-5" /></Button>
            </>
          )}
        </div>
        {/* Description */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Description:</span>
          {editingField === "description" ? (
            <>
              <textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full min-h-[60px]" style={{ minWidth: 180 }} />
              <Button onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save description"><CheckIcon className="h-5 w-5" /></Button>
              <Button onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></Button>
            </>
          ) : (
            <span className="ml-2 text-gray-800 dark:text-gray-100">{event.description || <span className="italic text-gray-400">(none)</span>}</span>
          )}
          <Button onClick={() => startEdit("description", event.description || "")} className="ml-2 text-blue-600" aria-label="Edit description"><PencilIcon className="h-5 w-5" /></Button>
        </div>
        {/* Code of Conduct */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Code of Conduct:</span>
          {editingField === "codeOfConduct" ? (
            <>
              <textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full min-h-[100px] font-mono" style={{ minWidth: 180 }} placeholder="Enter code of conduct in markdown..." />
              <Button onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save code of conduct"><CheckIcon className="h-5 w-5" /></Button>
              <Button onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></Button>
            </>
          ) : (
            <>
              {event.codeOfConduct ? (
                <Sheet open={showCodeSheet} onOpenChange={setShowCodeSheet}>
                  <SheetTrigger asChild>
                    <Button className="text-blue-600 dark:text-blue-400 underline font-medium ml-2">View Code of Conduct</Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-2xl">
                    <SheetHeader className="space-y-4">
                      <SheetTitle>Code of Conduct</SheetTitle>
                      <div className="flex gap-2">
                        <Button 
                          onClick={copyCodeOfConductLink}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <LinkIcon className="h-4 w-4" />
                          Copy Link
                        </Button>
                        <Button 
                          onClick={openCodeOfConductPage}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          Open Page
                        </Button>
                      </div>
                    </SheetHeader>
                    <div className="mt-6 prose dark:prose-invert max-h-[70vh] overflow-y-auto">
                      <ReactMarkdown>{event.codeOfConduct || "No code of conduct provided for this event."}</ReactMarkdown>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <span className="italic text-gray-400 ml-2">No code of conduct added. Please add one.</span>
              )}
              <Button onClick={() => startEdit("codeOfConduct", event.codeOfConduct || "")} className="ml-2 text-blue-600" aria-label="Edit code of conduct"><PencilIcon className="h-5 w-5" /></Button>
            </>
          )}
        </div>
        {/* Contact Email */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Contact Email:</span>
          {editingField === "contactEmail" ? (
            <>
              <Input type="email" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-64" placeholder="contact@example.com" />
              <Button onClick={saveEdit} className="text-green-600" aria-label="Save contact email"><CheckIcon className="h-5 w-5" /></Button>
              <Button onClick={cancelEdit} className="text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></Button>
            </>
          ) : (
            <>
              <span>{event.contactEmail || <span className="italic text-gray-400">(none)</span>}</span>
              <Button onClick={() => startEdit("contactEmail", event.contactEmail || "")} className="ml-2 text-blue-600" aria-label="Edit contact email"><PencilIcon className="h-5 w-5" /></Button>
            </>
          )}
        </div>
        {/* Success/Error messages */}
        {(metaEditSuccess || metaEditError) && (
          <div className="mt-2">
            {metaEditSuccess && <span className="text-green-600 dark:text-green-400">{metaEditSuccess}</span>}
            {metaEditError && <span className="text-red-600 dark:text-red-400 ml-4">{metaEditError}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

export default EventMetaEditor; 