"use client";

import { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";

interface WeddingCakeQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  productImage?: string;
}

export default function WeddingCakeQuoteModal({ isOpen, onClose, productImage }: WeddingCakeQuoteModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    guestCount: "",
    description: "",
  });
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const scrollYRef = useRef<number>(0);

  // Reset form state when modal opens and prevent background scroll
  useEffect(() => {
    if (isOpen) {
      setSubmitStatus("idle");
      setErrorMessage("");
      setRecaptchaToken(null);
      recaptchaRef.current?.reset();
      // Store current scroll position before locking
      scrollYRef.current = window.scrollY;
      // Prevent background scrolling
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      // Re-enable scrolling when modal closes
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    if (token) {
      setErrorMessage("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image must be less than 5MB");
      return;
    }

    setReferenceImage(file);
    setReferenceImagePreview(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    if (referenceImagePreview) {
      URL.revokeObjectURL(referenceImagePreview);
    }
    setReferenceImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate date limits (2 months ahead)
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 14); // At least 2 weeks out
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 2); // Max 2 months out

  const minDateStr = minDate.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setErrorMessage("Please enter your name");
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage("Please enter a valid email address");
      return false;
    }
    // Validate event date is required and within booking window
    if (!formData.eventDate) {
      setErrorMessage("Please select your event date");
      return false;
    }
    const selectedDate = new Date(formData.eventDate);
    if (selectedDate < minDate) {
      setErrorMessage("Event date must be at least 2 weeks from today");
      return false;
    }
    if (selectedDate > maxDate) {
      setErrorMessage("I'm currently only accepting wedding cake requests within the next 2 months. Please check back closer to your event date!");
      return false;
    }
    if (!formData.description.trim()) {
      setErrorMessage("Please describe your dream wedding cake");
      return false;
    }
    // Validate reCAPTCHA
    if (!recaptchaToken) {
      setErrorMessage("Please complete the reCAPTCHA verification");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload reference image if provided
      let referenceImageUrl = null;
      if (referenceImage) {
        setIsUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append("file", referenceImage);
        uploadFormData.append("folder", "wedding-quotes");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          referenceImageUrl = uploadData.url;
        }
        setIsUploading(false);
      }

      // Submit the quote request
      const response = await fetch("/api/wedding-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          referenceImageUrl,
          recaptchaToken,
        }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          eventDate: "",
          guestCount: "",
          description: "",
        });
        removeReferenceImage();
        setRecaptchaToken(null);
        recaptchaRef.current?.reset();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to submit quote request");
        setSubmitStatus("error");
        // Reset reCAPTCHA on error
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
      }
    } catch (error) {
      console.error("Error submitting quote:", error);
      setErrorMessage("Failed to submit quote request. Please try again.");
      setSubmitStatus("error");
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-kassyPink to-[#c97a8f] p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="font-playfair text-2xl md:text-3xl font-bold text-white">
            Request Wedding Cake Quote
          </h2>
          <p className="font-cormorant text-white/90 mt-2">
            Tell me about your dream wedding cake and I'll create a personalized quote.
          </p>
        </div>

        {/* Product Image Preview */}
        {productImage && (
          <div className="px-6 pt-6">
            <img
              src={productImage}
              alt="Wedding Cake"
              className="w-full max-w-xs mx-auto rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Success Message */}
        {submitStatus === "success" ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-4">
              Quote Request Sent!
            </h3>
            <p className="font-cormorant text-lg text-deepBurgundy/80 mb-6">
              Thank you for your interest! I'll review your request and get back to you with a personalized quote soon.
            </p>
            <button
              onClick={onClose}
              className="bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-8 py-3 rounded-full transition-all duration-300"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {errorMessage}
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-playfair text-lg font-semibold text-deepBurgundy border-b border-kassyPink/30 pb-2">
                Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-cormorant text-deepBurgundy mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-deepBurgundy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-kassyPink font-cormorant"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block font-cormorant text-deepBurgundy mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-deepBurgundy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-kassyPink font-cormorant"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-cormorant text-deepBurgundy mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-deepBurgundy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-kassyPink font-cormorant"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block font-cormorant text-deepBurgundy mb-1">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    min={minDateStr}
                    max={maxDateStr}
                    className="w-full px-4 py-2 border border-deepBurgundy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-kassyPink font-cormorant"
                  />
                  <p className="text-xs text-deepBurgundy/60 mt-1 font-cormorant">
                    Accepting requests within the next 2 months only
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-cormorant text-deepBurgundy mb-1">
                  Estimated Guest Count (optional)
                </label>
                <input
                  type="text"
                  name="guestCount"
                  value={formData.guestCount}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-deepBurgundy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-kassyPink font-cormorant"
                  placeholder="e.g., 50-75 guests"
                />
              </div>
            </div>

            {/* Cake Details */}
            <div className="space-y-4">
              <h3 className="font-playfair text-lg font-semibold text-deepBurgundy border-b border-kassyPink/30 pb-2">
                Tell Me About Your Dream Cake
              </h3>

              <div>
                <label className="block font-cormorant text-deepBurgundy mb-1">
                  Describe Your Vision <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-2 border border-deepBurgundy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-kassyPink font-cormorant resize-none"
                  placeholder="Tell me about your dream wedding cake - the style, colors, flavors, number of tiers, decorations, or any special details you'd like..."
                />
              </div>

              {/* Reference Image Upload */}
              <div>
                <label className="block font-cormorant text-deepBurgundy mb-1">
                  Reference Image (optional)
                </label>
                <p className="text-sm text-deepBurgundy/60 mb-2">
                  Upload an inspiration photo to help me understand your vision
                </p>

                {referenceImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={referenceImagePreview}
                      alt="Reference"
                      className="w-48 h-48 object-cover rounded-lg border-2 border-kassyPink"
                    />
                    <button
                      type="button"
                      onClick={removeReferenceImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-deepBurgundy/30 rounded-lg p-6 text-center cursor-pointer hover:border-kassyPink transition-colors"
                  >
                    <svg className="w-10 h-10 mx-auto text-deepBurgundy/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-cormorant text-deepBurgundy/60">
                      Click to upload an inspiration image
                    </p>
                    <p className="font-cormorant text-sm text-deepBurgundy/40 mt-1">
                      Max 5MB - JPG, PNG, GIF
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                onChange={handleRecaptchaChange}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg py-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isUploading ? "Uploading Image..." : "Sending Request..."}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Get Quote
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
