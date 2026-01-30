"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Calendar,
  Edit2,
  Globe,
  Home,
  MapPin,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/lib/mutations/settings";
import type { UserSettings } from "@/lib/queries/settings";

// Countries list with flag emojis
const COUNTRIES = [
  { name: "American", flag: "🇺🇸" },
  { name: "British", flag: "🇬🇧" },
  { name: "Canadian", flag: "🇨🇦" },
  { name: "Australian", flag: "🇦🇺" },
  { name: "German", flag: "🇩🇪" },
  { name: "French", flag: "🇫🇷" },
  { name: "Italian", flag: "🇮🇹" },
  { name: "Spanish", flag: "🇪🇸" },
  { name: "Portuguese", flag: "🇵🇹" },
  { name: "Brazilian", flag: "🇧🇷" },
  { name: "Mexican", flag: "🇲🇽" },
  { name: "Chinese", flag: "🇨🇳" },
  { name: "Japanese", flag: "🇯🇵" },
  { name: "Korean", flag: "🇰🇷" },
  { name: "Indian", flag: "🇮🇳" },
  { name: "Russian", flag: "🇷🇺" },
  { name: "Dutch", flag: "🇳🇱" },
  { name: "Swedish", flag: "🇸🇪" },
  { name: "Norwegian", flag: "🇳🇴" },
  { name: "Danish", flag: "🇩🇰" },
  { name: "Finnish", flag: "🇫🇮" },
  { name: "Polish", flag: "🇵🇱" },
  { name: "Greek", flag: "🇬🇷" },
  { name: "Turkish", flag: "🇹🇷" },
  { name: "Irish", flag: "🇮🇪" },
  { name: "Belgian", flag: "🇧🇪" },
  { name: "Swiss", flag: "🇨🇭" },
  { name: "Austrian", flag: "🇦🇹" },
  { name: "Czech", flag: "🇨🇿" },
  { name: "Hungarian", flag: "🇭🇺" },
  { name: "Romanian", flag: "🇷🇴" },
  { name: "Bulgarian", flag: "🇧🇬" },
  { name: "Croatian", flag: "🇭🇷" },
  { name: "Serbian", flag: "🇷🇸" },
  { name: "Ukrainian", flag: "🇺🇦" },
  { name: "Thai", flag: "🇹🇭" },
  { name: "Vietnamese", flag: "🇻🇳" },
  { name: "Indonesian", flag: "🇮🇩" },
  { name: "Malaysian", flag: "🇲🇾" },
  { name: "Singaporean", flag: "🇸🇬" },
  { name: "Filipino", flag: "🇵🇭" },
  { name: "South African", flag: "🇿🇦" },
  { name: "Nigerian", flag: "🇳🇬" },
  { name: "Egyptian", flag: "🇪🇬" },
  { name: "Moroccan", flag: "🇲🇦" },
  { name: "Israeli", flag: "🇮🇱" },
  { name: "Saudi", flag: "🇸🇦" },
  { name: "Emirati", flag: "🇦🇪" },
  { name: "Argentinian", flag: "🇦🇷" },
  { name: "Chilean", flag: "🇨🇱" },
  { name: "Colombian", flag: "🇨🇴" },
  { name: "Peruvian", flag: "🇵🇪" },
  { name: "Venezuelan", flag: "🇻🇪" },
  { name: "New Zealander", flag: "🇳🇿" },
].sort((a, b) => a.name.localeCompare(b.name));

interface ProfileSectionProps {
  settings: UserSettings;
}

export function ProfileSection({ settings }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

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
  const [wordsPerDay, setWordsPerDay] = useState(settings.wordsPerDay);
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

  const handleSave = () => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateProfile({
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        website: website || undefined,
        hometown: hometown || undefined,
        location: location || undefined,
        nationalities,
        wordsPerDay,
      });

      if (result.success) {
        setSuccess(true);
        setIsEditing(false);
        // Clear any existing timeout before setting a new one
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = setTimeout(() => setSuccess(false), 3000);
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
    setWordsPerDay(settings.wordsPerDay);
    setIsEditing(false);
    setError(null);
  };

  const joinDateFormatted = new Date(settings.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
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

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">
          Profile updated successfully!
        </div>
      )}

      {isEditing ? (
        <div className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-3xl text-white">
              {settings.avatarUrl ? (
                <img
                  src={settings.avatarUrl}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-10 w-10" />
              )}
            </div>
            <div className="flex-1 space-y-3">
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

          {/* Bio */}
          <div>
            <label className="mb-1 block text-sm text-gray-600">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="flex min-h-[100px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
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
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1"
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
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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

          {/* Learning Preferences */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 font-medium">Learning Preferences</h3>
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Words per day goal
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={wordsPerDay}
                  onChange={(e) =>
                    setWordsPerDay(
                      Math.min(100, Math.max(1, parseInt(e.target.value) || 10))
                    )
                  }
                  className="w-24"
                />
                <span className="text-sm text-gray-500">words per day</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* View Mode */}
          <div className="mb-4 flex flex-col items-start">
            <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-4xl text-white">
              {settings.avatarUrl ? (
                <img
                  src={settings.avatarUrl}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4" />
                <span>{settings.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-4 w-4" />
                <span>Joined {joinDateFormatted}</span>
              </div>
            </div>

            <div className="pt-2">
              <p className="mb-1 text-sm text-gray-500">Bio</p>
              <p className="text-gray-700">
                {settings.bio || (
                  <span className="italic text-gray-400">No bio yet</span>
                )}
              </p>
            </div>

            <div className="pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="mb-1 text-sm text-gray-500">Hometown</p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Home className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {settings.hometown || (
                        <span className="italic text-gray-400">Not set</span>
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
                        <span className="italic text-gray-400">Not set</span>
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-500">Nationalities</p>
                  {settings.nationalities && settings.nationalities.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {settings.nationalities.map((nationality, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1"
                        >
                          <span className="text-base">
                            {getCountryFlag(nationality)}
                          </span>
                          <span className="text-xs">{nationality}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm italic text-gray-400">
                      Not set
                    </span>
                  )}
                </div>
              </div>
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
                      className="text-primary hover:underline"
                    >
                      Website
                    </a>
                  ) : (
                    <span className="italic text-gray-400">No website</span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="mb-1 text-sm text-gray-500">Learning Preferences</p>
              <p className="text-gray-700">
                <span className="font-medium">{settings.wordsPerDay}</span>{" "}
                words per day goal
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
