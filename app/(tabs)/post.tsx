import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { X, Plus } from 'lucide-react-native';
import { pickImage, uploadImage } from '@/lib/storage';

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Books',
  'Clothing',
  'Sports',
  'Tools',
  'Vehicles',
  'Other',
];

export default function Post() {
  const [postType, setPostType] = useState<'listing' | 'request'>('listing');
  const [actionType, setActionType] = useState<'sell' | 'rent' | 'buy'>(
    'sell'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<'fixed' | 'per_day' | 'per_month'>(
    'fixed'
  );
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleAddImage = async () => {
    try {
      const imageUri = await pickImage();
      if (imageUri) {
        setUploading(true);
        const url = await uploadImage(imageUri, postType);
        setImages((prev) => [...prev, url]);
      }
    } catch {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title || !description || !category || !location) {
      setError('Please fill in all required fields');
      return;
    }

    if (!price && postType === 'listing') {
      setError('Please enter a price');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (postType === 'listing') {
        const { error } = await supabase.from('listings').insert({
          user_id: user?.id,
          title,
          description,
          category,
          listing_type: actionType,
          price: parseFloat(price),
          price_unit: priceUnit,
          images,
          location,
          status: 'available',
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.from('requests').insert({
          user_id: user?.id,
          title,
          description,
          category,
          request_type: actionType === 'buy' ? 'buy' : 'rent',
          budget: price ? parseFloat(price) : null,
          budget_unit: priceUnit,
          images,
          location,
          status: 'active',
        });

        if (error) throw error;
      }

      setTitle('');
      setDescription('');
      setPrice('');
      setLocation('');
      setImages([]);

      if (postType === 'listing') {
        router.push('/(tabs)');
      } else {
        router.push('/(tabs)/requests');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              postType === 'listing' && styles.typeButtonActive,
            ]}
            onPress={() => {
              setPostType('listing');
              setActionType('sell');
            }}>
            <Text
              style={[
                styles.typeButtonText,
                postType === 'listing' && styles.typeButtonTextActive,
              ]}>
              Post Listing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              postType === 'request' && styles.typeButtonActive,
            ]}
            onPress={() => {
              setPostType('request');
              setActionType('buy');
            }}>
            <Text
              style={[
                styles.typeButtonText,
                postType === 'request' && styles.typeButtonTextActive,
              ]}>
              Post Request
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionSelector}>
          {postType === 'listing' ? (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  actionType === 'sell' && styles.actionButtonActive,
                ]}
                onPress={() => {
                  setActionType('sell');
                  setPriceUnit('fixed');
                }}>
                <Text
                  style={[
                    styles.actionButtonText,
                    actionType === 'sell' && styles.actionButtonTextActive,
                  ]}>
                  Sell
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  actionType === 'rent' && styles.actionButtonActive,
                ]}
                onPress={() => {
                  setActionType('rent');
                  setPriceUnit('per_day');
                }}>
                <Text
                  style={[
                    styles.actionButtonText,
                    actionType === 'rent' && styles.actionButtonTextActive,
                  ]}>
                  Rent
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  actionType === 'buy' && styles.actionButtonActive,
                ]}
                onPress={() => {
                  setActionType('buy');
                  setPriceUnit('fixed');
                }}>
                <Text
                  style={[
                    styles.actionButtonText,
                    actionType === 'buy' && styles.actionButtonTextActive,
                  ]}>
                  Want to Buy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  actionType === 'rent' && styles.actionButtonActive,
                ]}
                onPress={() => {
                  setActionType('rent');
                  setPriceUnit('per_day');
                }}>
                <Text
                  style={[
                    styles.actionButtonText,
                    actionType === 'rent' && styles.actionButtonTextActive,
                  ]}>
                  Want to Rent
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>Images</Text>
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveImage(index)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleAddImage}
                disabled={uploading}>
                <Plus size={32} color="#007AFF" />
                <Text style={styles.addImageText}>
                  {uploading ? 'Uploading...' : `Add Image (${images.length}/5)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              postType === 'listing'
                ? 'e.g. iPhone 12 Pro Max'
                : 'e.g. Looking for iPhone'
            }
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide details..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat)}>
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextActive,
                  ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            {postType === 'listing' ? 'Price' : 'Budget'}{' '}
            <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.priceRow}>
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="0"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            {(actionType === 'rent' ||
              (postType === 'request' && actionType !== 'buy')) && (
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    priceUnit === 'per_day' && styles.unitButtonActive,
                  ]}
                  onPress={() => setPriceUnit('per_day')}>
                  <Text
                    style={[
                      styles.unitButtonText,
                      priceUnit === 'per_day' && styles.unitButtonTextActive,
                    ]}>
                    /day
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    priceUnit === 'per_month' && styles.unitButtonActive,
                  ]}
                  onPress={() => setPriceUnit('per_month')}>
                  <Text
                    style={[
                      styles.unitButtonText,
                      priceUnit === 'per_month' && styles.unitButtonTextActive,
                    ]}>
                    /month
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.label}>
            Location <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Koramangala, Bangalore"
            value={location}
            onChangeText={setLocation}
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}>
            <Text style={styles.submitButtonText}>
              {loading ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  actionSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#34c759',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  required: {
    color: '#ff3b30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  priceRow: {
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  addImageText: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 4,
    textAlign: 'center',
  },
});
