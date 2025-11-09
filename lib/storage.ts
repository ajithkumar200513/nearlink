import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

export async function pickImage(): Promise<string | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error: any) {
    console.error('Error picking image:', error.message);
    throw error;
  }
}

export async function uploadImage(uri: string, folder: string): Promise<string> {
  try {
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const filepath = `${folder}/${filename}`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { error, data } = await supabase.storage
      .from('listings')
      .upload(filepath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('listings')
      .getPublicUrl(filepath);

    return publicUrl.publicUrl;
  } catch (error: any) {
    console.error('Error uploading image:', error.message);
    throw error;
  }
}

export async function uploadMultipleImages(
  uris: string[],
  folder: string
): Promise<string[]> {
  try {
    const urls: string[] = [];

    for (const uri of uris) {
      const url = await uploadImage(uri, folder);
      urls.push(url);
    }

    return urls;
  } catch (error: any) {
    console.error('Error uploading multiple images:', error.message);
    throw error;
  }
}
