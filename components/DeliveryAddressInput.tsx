"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Kyle, TX coordinates (center of delivery zone)
const KYLE_TX_CENTER = { lat: 29.9894, lng: -97.8772 };
const DELIVERY_RADIUS_MILES = 50;
const DELIVERY_RADIUS_METERS = DELIVERY_RADIUS_MILES * 1609.34; // Convert miles to meters

interface DeliveryAddressInputProps {
  onAddressChange: (address: DeliveryAddress | null) => void;
  initialAddress?: DeliveryAddress | null;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
  lat: number;
  lng: number;
  isWithinDeliveryZone: boolean;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export default function DeliveryAddressInput({ onAddressChange, initialAddress }: DeliveryAddressInputProps) {
  const [address, setAddress] = useState<DeliveryAddress | null>(initialAddress || null);
  const [inputValue, setInputValue] = useState(initialAddress?.fullAddress || "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError("Google Maps API key not configured");
      setIsLoading(false);
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      setIsLoading(false);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for existing script to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkLoaded);
          setMapLoaded(true);
          setIsLoading(false);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Define callback before loading script
    window.initGoogleMaps = () => {
      setMapLoaded(true);
      setIsLoading(false);
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setError("Failed to load Google Maps");
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      window.initGoogleMaps = () => {};
    };
  }, []);

  // Initialize map and autocomplete
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !inputRef.current) return;

    // Initialize map
    const map = new window.google.maps.Map(mapRef.current, {
      center: KYLE_TX_CENTER,
      zoom: 9,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });
    mapInstanceRef.current = map;

    // Add delivery zone circle
    const circle = new window.google.maps.Circle({
      strokeColor: "#ff94b3",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#ff94b3",
      fillOpacity: 0.15,
      map: map,
      center: KYLE_TX_CENTER,
      radius: DELIVERY_RADIUS_METERS,
    });
    circleRef.current = circle;

    // Add Kyle marker
    new window.google.maps.Marker({
      position: KYLE_TX_CENTER,
      map: map,
      title: "Kassy Cakes - Kyle, TX",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/pink-dot.png",
      },
    });

    // Initialize autocomplete
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      fields: ["address_components", "geometry", "formatted_address"],
      types: ["address"],
    });
    autocompleteRef.current = autocomplete;

    // Bias results towards Kyle, TX area
    const bounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(29.5, -98.3), // SW
      new window.google.maps.LatLng(30.5, -97.3)  // NE
    );
    autocomplete.setBounds(bounds);

    // Handle place selection
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location) {
        setError("Please select a valid address from the dropdown");
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      // Parse address components
      let street = "";
      let city = "";
      let state = "";
      let zipCode = "";

      for (const component of place.address_components || []) {
        const type = component.types[0];
        if (type === "street_number") {
          street = component.long_name + " ";
        } else if (type === "route") {
          street += component.long_name;
        } else if (type === "locality") {
          city = component.long_name;
        } else if (type === "administrative_area_level_1") {
          state = component.short_name;
        } else if (type === "postal_code") {
          zipCode = component.long_name;
        }
      }

      // Check if within delivery zone
      const distance = getDistanceFromKyle(lat, lng);
      const isWithinDeliveryZone = distance <= DELIVERY_RADIUS_MILES;

      const newAddress: DeliveryAddress = {
        street: street.trim(),
        city,
        state,
        zipCode,
        fullAddress: place.formatted_address || "",
        lat,
        lng,
        isWithinDeliveryZone,
      };

      setAddress(newAddress);
      setInputValue(place.formatted_address || "");
      setError(null);
      onAddressChange(newAddress);

      // Update map
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: "Delivery Address",
        icon: isWithinDeliveryZone
          ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
          : "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        animation: window.google.maps.Animation.DROP,
      });
      markerRef.current = marker;

      // Fit bounds to show both markers
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(KYLE_TX_CENTER);
      bounds.extend({ lat, lng });
      map.fitBounds(bounds, 50);
    });

  }, [mapLoaded, onAddressChange]);

  // Calculate distance from Kyle, TX using Haversine formula
  const getDistanceFromKyle = (lat: number, lng: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat - KYLE_TX_CENTER.lat);
    const dLng = toRad(lng - KYLE_TX_CENTER.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(KYLE_TX_CENTER.lat)) *
        Math.cos(toRad(lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg: number): number => deg * (Math.PI / 180);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!e.target.value) {
      setAddress(null);
      onAddressChange(null);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }
  };

  if (error === "Google Maps API key not configured") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="font-cormorant text-yellow-800 text-sm">
          Delivery address validation is temporarily unavailable. Please enter your address and we'll confirm the delivery area.
        </p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onAddressChange({
              street: e.target.value,
              city: "",
              state: "TX",
              zipCode: "",
              fullAddress: e.target.value,
              lat: 0,
              lng: 0,
              isWithinDeliveryZone: true, // Assume valid, will verify manually
            });
          }}
          placeholder="Enter your delivery address"
          className="w-full mt-3 px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address Input */}
      <div>
        <label className="block font-cormorant text-deepBurgundy mb-2 font-semibold">
          Delivery Address
        </label>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Start typing your address..."
          className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
        />
        {error && (
          <p className="text-red-500 text-sm mt-1 font-cormorant">{error}</p>
        )}
      </div>

      {/* Map */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-creamWhite/80 flex items-center justify-center z-10 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kassyPink"></div>
          </div>
        )}
        <div
          ref={mapRef}
          className="w-full h-64 rounded-lg border-2 border-deepBurgundy/20 overflow-hidden"
        />
      </div>

      {/* Delivery Zone Info */}
      <div className="bg-kassyPink/10 rounded-lg p-3 flex items-start gap-2">
        <svg className="w-5 h-5 text-kassyPink mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-cormorant text-sm text-deepBurgundy">
          Delivery available within <strong>50 miles</strong> of Kyle, TX.
          Pink circle shows our delivery zone.
        </p>
      </div>

      {/* Validation Result */}
      {address && (
        <div className={`rounded-lg p-4 ${address.isWithinDeliveryZone ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {address.isWithinDeliveryZone ? (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-cormorant text-green-800">
                Great news! We deliver to <strong>{address.city || 'your area'}</strong>.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-cormorant text-red-800 font-semibold">
                  Sorry, this address is outside our delivery area.
                </p>
                <p className="font-cormorant text-red-700 text-sm mt-1">
                  Please select <strong>Pickup</strong> instead, or enter an address within the Austin metro area.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
