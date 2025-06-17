import React from "react";
import ReactMarkdown from "react-markdown";
import { Card } from "./ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PencilIcon, CheckIcon, XMarkIcon, LinkIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { CoCTeamList } from "./CoCTeamList";

interface EventMeta {
  name: string;
  startDate?: string;
  endDate?: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  codeOfConduct?: string;
  logo?: string;
  slug?: string;
}

export interface EventMetaCardProps {
  event: EventMeta;
  logoPreview?: string;
  logoExists?: boolean;
  eventSlug?: string;
  showCodeButton?: boolean;
  showEdit?: boolean;
  editingField?: string;
  editValue?: string | number | Date;
  onEditStart?: (field: string, value: unknown) => void;
  onEditChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  metaEditError?: string;
  metaEditSuccess?: string;
  logoUploadLoading?: boolean;
  handleLogoFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  logoFile?: File;
  showCodeSheet?: boolean;
  setShowCodeSheet?: (show: boolean) => void;
}

export default function EventMetaCard({
  event,
  logoPreview,
  logoExists,
  eventSlug,
  showCodeButton = true,
  showEdit = false,
  editingField,
  editValue,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  metaEditError,
  metaEditSuccess,
  logoUploadLoading,
  handleLogoFileChange,
  logoFile,
  showCodeSheet,
  setShowCodeSheet,
}: EventMetaCardProps) {
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const logoSrc =
    logoPreview ||
    (logoExists ? `${backendBaseUrl}/api/events/slug/${eventSlug}/logo` : null);

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-4">
        {/* Logo */}
        <div className="relative">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Event Logo"
              className="w-24 h-24 object-contain rounded bg-white border border-gray-200 dark:border-gray-700"
            />
          ) : null}
          {showEdit &&
            (editingField === "logo" ? (
              <div className="absolute top-0 left-0 w-24 h-24 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded z-10 p-2">
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    Upload Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="block w-full text-xs text-gray-700 dark:text-gray-200"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    or
                  </span>
                  <input
                    type="text"
                    value={typeof editValue === 'string' ? editValue : ''}
                    onChange={onEditChange}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full text-xs"
                    placeholder="Logo URL"
                    disabled={!!logoFile}
                  />
                </div>
                <div className="flex gap-1 mt-2">
                  <button
                    type="button"
                    onClick={onEditSave}
                    className="text-green-600"
                    aria-label="Save logo"
                    disabled={logoUploadLoading}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onEditCancel}
                    className="text-gray-500"
                    aria-label="Cancel edit"
                    disabled={logoUploadLoading}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
                {logoUploadLoading && (
                  <span className="text-xs text-gray-500 mt-1">
                    Uploading...
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onEditStart && onEditStart("logo", event.logo)}
                className="absolute top-1 right-1 text-blue-600 bg-white dark:bg-gray-900 rounded-full p-1 shadow"
                aria-label="Edit logo"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            ))}
        </div>
        <div className="flex-1">
          {/* Name */}
          <div className="flex items-center gap-2 mb-2">
            {showEdit && editingField === "name" ? (
              <>
                <input
                  type="text"
                  value={typeof editValue === 'string' ? editValue : ''}
                  onChange={onEditChange}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-2xl font-bold"
                  style={{ minWidth: 120 }}
                />
                <button
                  type="button"
                  onClick={onEditSave}
                  className="text-green-600"
                  aria-label="Save event name"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onEditCancel}
                  className="text-gray-500"
                  aria-label="Cancel edit"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{event.name}</h1>
                {showEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      onEditStart && onEditStart("name", event.name)
                    }
                    className="text-blue-600"
                    aria-label="Edit event name"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
          </div>
          {/* Dates and Website */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200 mb-2">
            <span className="flex items-center gap-1">
              <b>Start:</b>
              {showEdit && editingField === "startDate" ? (
                <>
                  <input
                    type="date"
                    value={typeof editValue === 'string' ? editValue.slice(0, 10) : ''}
                    onChange={onEditChange}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <button
                    type="button"
                    onClick={onEditSave}
                    className="text-green-600 ml-1"
                    aria-label="Save start date"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onEditCancel}
                    className="text-gray-500 ml-1"
                    aria-label="Cancel edit"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  {event.startDate ? (
                    new Date(event.startDate).toLocaleDateString()
                  ) : (
                    <span className="italic text-gray-400">(none)</span>
                  )}
                  {showEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        onEditStart && onEditStart("startDate", event.startDate)
                      }
                      className="text-blue-600 ml-1"
                      aria-label="Edit start date"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </span>
            <span className="flex items-center gap-1">
              <b>End:</b>
              {showEdit && editingField === "endDate" ? (
                <>
                  <input
                    type="date"
                    value={typeof editValue === 'string' ? editValue.slice(0, 10) : ''}
                    onChange={onEditChange}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <button
                    type="button"
                    onClick={onEditSave}
                    className="text-green-600 ml-1"
                    aria-label="Save end date"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onEditCancel}
                    className="text-gray-500 ml-1"
                    aria-label="Cancel edit"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  {event.endDate ? (
                    new Date(event.endDate).toLocaleDateString()
                  ) : (
                    <span className="italic text-gray-400">(none)</span>
                  )}
                  {showEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        onEditStart && onEditStart("endDate", event.endDate)
                      }
                      className="text-blue-600 ml-1"
                      aria-label="Edit end date"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </span>
            <span className="flex items-center gap-1">
              <b>Website:</b>
              {showEdit && editingField === "website" ? (
                <>
                  <input
                    type="text"
                    value={typeof editValue === 'string' ? editValue : ''}
                    onChange={onEditChange}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <button
                    type="button"
                    onClick={onEditSave}
                    className="text-green-600 ml-1"
                    aria-label="Save website"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onEditCancel}
                    className="text-gray-500 ml-1"
                    aria-label="Cancel edit"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  {event.website ? (
                    <a
                      href={event.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-600 dark:text-blue-400"
                    >
                      {event.website}
                    </a>
                  ) : (
                    <span className="italic text-gray-400">(none)</span>
                  )}
                  {showEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        onEditStart && onEditStart("website", event.website)
                      }
                      className="text-blue-600 ml-1"
                      aria-label="Edit website"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </span>
            {/* Contact Email */}
            {event.contactEmail && (
              <span className="flex items-center gap-1">
                <b>Contact Email:</b>
                <a
                  href={`mailto:${event.contactEmail}`}
                  className="underline text-blue-600 dark:text-blue-400"
                >
                  {event.contactEmail}
                </a>
              </span>
            )}
          </div>
          {/* Description */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">Description:</span>
            {showEdit && editingField === "description" ? (
              <>
                <textarea
                  value={typeof editValue === 'string' ? editValue : ''}
                  onChange={onEditChange}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full min-h-[60px]"
                  style={{ minWidth: 180 }}
                />
                <button
                  type="button"
                  onClick={onEditSave}
                  className="ml-2 text-green-600"
                  aria-label="Save description"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onEditCancel}
                  className="ml-1 text-gray-500"
                  aria-label="Cancel edit"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </>
            ) : (
              <span className="ml-2 text-gray-800 dark:text-gray-100">
                {event.description || (
                  <span className="italic text-gray-400">(none)</span>
                )}
              </span>
            )}
            {showEdit && (
              <button
                type="button"
                onClick={() =>
                  onEditStart && onEditStart("description", event.description)
                }
                className="ml-2 text-blue-600"
                aria-label="Edit description"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          {/* Code of Conduct */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">Code of Conduct:</span>
            {showCodeButton && (
              <Sheet open={showCodeSheet} onOpenChange={setShowCodeSheet}>
                <SheetTrigger asChild>
                  <Button className="text-blue-600 dark:text-blue-400 underline font-medium">
                    View Code of Conduct
                  </Button>
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
            )}
            {showEdit && (
              <button
                type="button"
                onClick={() =>
                  onEditStart &&
                  onEditStart("codeOfConduct", event.codeOfConduct)
                }
                className="ml-2 text-blue-600"
                aria-label="Edit code of conduct"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          {/* Success/Error messages */}
          {showEdit && (metaEditSuccess || metaEditError) && (
            <div className="mt-2">
              {metaEditSuccess && (
                <span className="text-green-600 dark:text-green-400">
                  {metaEditSuccess}
                </span>
              )}
              {metaEditError && (
                <span className="text-red-600 dark:text-red-400 ml-4">
                  {metaEditError}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Divider and Code of Conduct Team */}
      <hr className="my-6 border-gray-200 dark:border-gray-700" />
      <CoCTeamList eventSlug={eventSlug || ""} />
    </Card>
  );
} 