// UC #2-5 attachment picker (expo-document-picker: jpg/png/pdf). Returns null when cancelled.
import * as DocumentPicker from 'expo-document-picker';
import { ATTACHMENT_CONTENT_TYPES } from '@silveracademy/shared';

export interface PickedFile {
  uri: string;
  name: string;
  sizeBytes: number;
  contentType: string;
}

/** Rejects when the picker itself fails; callers must handle it. */
export async function pickAttachment(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...ATTACHMENT_CONTENT_TYPES],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    name: asset.name,
    sizeBytes: asset.size ?? 0,
    contentType: asset.mimeType ?? '',
  };
}
