export const isLocationPresetLocked = (locationMode, selectedPresetId) => locationMode === 'preset' && Boolean(selectedPresetId);

export const shouldRequireLocationName = ({ requireGps, latitude, longitude, locationMode, selectedPresetId }) => {
  if (!requireGps) return false;
  const hasCoordinates = Boolean(latitude && longitude);
  return hasCoordinates && (!selectedPresetId || locationMode === 'manual');
};

export const getMatchingPresetForCoordinates = (latitude, longitude, presets = []) => {
  if (!latitude || !longitude || !Array.isArray(presets) || presets.length === 0) {
    return null;
  }

  const normalizedLatitude = String(latitude).trim();
  const normalizedLongitude = String(longitude).trim();

  return presets.find((preset) => {
    const presetLat = String(preset?.latitude ?? '').trim();
    const presetLng = String(preset?.longitude ?? '').trim();
    return presetLat === normalizedLatitude && presetLng === normalizedLongitude;
  }) ?? null;
};
