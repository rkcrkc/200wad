"use client";

import { useState, useTransition, useRef } from "react";
import {
  User,
  Edit2,
  Globe,
  Home,
  MapPin,
  X,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { updateProfile } from "@/lib/mutations/settings";
import { uploadAvatar, removeAvatar } from "@/lib/mutations/avatar";
import type { UserSettings } from "@/lib/queries/settings";

// Countries list with flag emojis
const COUNTRIES = [
  { name: "United States", flag: "🇺🇸" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "France", flag: "🇫🇷" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "China", flag: "🇨🇳" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "India", flag: "🇮🇳" },
  { name: "Russia", flag: "🇷🇺" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Finland", flag: "🇫🇮" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "Hungary", flag: "🇭🇺" },
  { name: "Romania", flag: "🇷🇴" },
  { name: "Bulgaria", flag: "🇧🇬" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Serbia", flag: "🇷🇸" },
  { name: "Ukraine", flag: "🇺🇦" },
  { name: "Thailand", flag: "🇹🇭" },
  { name: "Vietnam", flag: "🇻🇳" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "Malaysia", flag: "🇲🇾" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "Philippines", flag: "🇵🇭" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Israel", flag: "🇮🇱" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Venezuela", flag: "🇻🇪" },
  { name: "New Zealand", flag: "🇳🇿" },
].sort((a, b) => a.name.localeCompare(b.name));

interface ProfileSectionProps {
  settings: UserSettings;
}

export function ProfileSection({ settings }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(settings.avatarUrl);

  // Form state
  const [name, setName] = useState(settings.name || "");
  const [username, setUsername] = useState(settings.username || "");
  const [bio, setBio] = useState(settings.bio || "");
  const [website, setWebsite] = useState(settings.website || "");
  const [hometown, setHometown] = useState(settings.hometown || "");
  const [location, setLocation] = useState(settings.location || "");
  const [nationalities, setNationalities] = useState<string[]>(
    settings.nationalities || []
  );
  const [selectedCountry, setSelectedCountry] = useState("");

  const getCountryFlag = (countryName: string) => {
    const country = COUNTRIES.find((c) => c.name === countryName);
    return country?.flag || "🏳️";
  };

  const handleAddNationality = () => {
    if (selectedCountry && !nationalities.includes(selectedCountry)) {
      setNationalities([...nationalities, selectedCountry]);
      setSelectedCountry("");
    }
  };

  const handleRemoveNationality = (nationality: string) => {
    setNationalities(nationalities.filter((n) => n !== nationality));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setError(null);

    const formData = new FormData();
    formData.append("avatar", file);

    const result = await uploadAvatar(formData);

    if (result.success && result.avatarUrl) {
      setAvatarUrl(result.avatarUrl);
    } else {
      setError(result.error || "Failed to upload avatar");
    }

    setIsUploadingAvatar(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setError(null);

    const result = await removeAvatar();

    if (result.success) {
      setAvatarUrl(null);
    } else {
      setError(result.error || "Failed to remove avatar");
    }

    setIsUploadingAvatar(false);
  };

  const handleSave = () => {
    setError(null);

    startTransition(async () => {
      const result = await updateProfile({
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        website: website || undefined,
        hometown: hometown || undefined,
        location: location || undefined,
        nationalities,
      });

      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error || "Failed to update profile");
      }
    });
  };

  const handleCancel = () => {
    // Reset form to original values
    setName(settings.name || "");
    setUsername(settings.username || "");
    setBio(settings.bio || "");
    setWebsite(settings.website || "");
    setHometown(settings.hometown || "");
    setLocation(settings.location || "");
    setNationalities(settings.nationalities || []);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-6 flex items-start justify-between">
        <h2 className="text-xl font-semibold">Profile Information</h2>
        {!isEditing ? (
          <Button
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="text-primary hover:bg-primary/10"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-start gap-4">
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-4xl text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-all group-hover:bg-black/40">
                  <Upload className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </button>
              {avatarUrl && !isUploadingAvatar && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAvatar();
                  }}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white shadow-md transition-transform hover:scale-110"
                  title="Remove avatar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="w-full space-y-3">
              <div>
                <label className="mb-1 block text-sm text-gray-600">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Username
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Hometown
              </label>
              <Input
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                placeholder="Where you're from"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Current Location
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where you live now"
              />
            </div>
          </div>

          {/* Nationalities */}
          <div>
            <label className="mb-1 block text-sm text-gray-600">
              Nationalities
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {nationalities.map((nationality) => (
                <div
                  key={nationality}
                  className="flex items-center gap-1 rounded-full bg-bone px-3 py-1"
                >
                  <span>{getCountryFlag(nationality)}</span>
                  <span className="text-sm">{nationality}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNationality(nationality)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-input-background px-4 py-3 pr-10 text-base text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
              >
                <option value="">Select a country...</option>
                {COUNTRIES.filter((c) => !nationalities.includes(c.name)).map(
                  (country) => (
                    <option key={country.name} value={country.name}>
                      {country.flag} {country.name}
                    </option>
                  )
                )}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNationality}
                disabled={!selectedCountry}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1 block text-sm text-gray-600">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="flex min-h-[100px] w-full rounded-lg border border-border bg-input-background px-4 py-3 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:text-sm"
            />
          </div>

          {/* Website */}
          <div>
            <label className="mb-1 block text-sm text-gray-600">Website</label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              type="url"
            />
          </div>

        </div>
      ) : (
        <div className="space-y-4">
          {/* View Mode */}
          <div className="mb-4 flex flex-col items-start">
            <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-4xl text-white">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-12 w-12" />
              )}
            </div>
            <h3 className="text-2xl font-semibold">
              {settings.name || "No name set"}
            </h3>
            {settings.username && (
              <p className="text-base text-gray-500">@{settings.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="mb-1 text-sm text-gray-500">Hometown</p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Home className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {settings.hometown || (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-500">Current Location</p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {settings.location || (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-500">Nationalities</p>
                  {settings.nationalities && settings.nationalities.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {settings.nationalities.map((nationality, index) => (
                        <Tooltip key={index} label={nationality}>
                          <span className="flex h-7 w-7 cursor-default items-center justify-center rounded-full bg-bone text-base">
                            {getCountryFlag(nationality)}
                          </span>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Not set
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="mb-1 text-sm text-gray-500">Bio</p>
              <p className="text-sm text-gray-700">
                {settings.bio || (
                  <span className="text-gray-400">No bio yet</span>
                )}
              </p>
            </div>

            <div className="pt-2">
              <p className="mb-1 text-sm text-gray-500">Links</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  {settings.website ? (
                    <a
                      href={settings.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Website
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">No website</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
