import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { User, MapPin, Phone, LogOut, Edit2, Save } from 'lucide-react-native';

interface UserProfile {
  full_name: string;
  phone: string | null;
  location: string | null;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setLocation(data.location || '');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          location: location || null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile({
        full_name: fullName,
        phone: phone || null,
        location: location || null,
      });
      setEditing(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User size={48} color="#007AFF" />
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {!editing ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setEditing(true)}>
              <Edit2 size={20} color="#007AFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSave}
              disabled={saving}>
              <Save size={20} color="#34c759" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <View style={styles.fieldIcon}>
            <User size={20} color="#666" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.full_name || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.fieldIcon}>
            <Phone size={20} color="#666" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 XXXXX XXXXX"
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.phone || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.fieldIcon}>
            <MapPin size={20} color="#666" />
          </View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>Location</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Your area/city"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.location || 'Not set'}
              </Text>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color="#ff3b30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  iconButton: {
    padding: 8,
  },
  field: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldIcon: {
    marginRight: 12,
    paddingTop: 2,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  input: {
    fontSize: 16,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingVertical: 4,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
});
