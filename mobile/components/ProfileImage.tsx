import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Avatar, IconButton, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';

interface ProfileImageProps {
  imageUrl?: string | null;
  size?: number;
  onImageSelected: (uri: string) => void;
  editable?: boolean;
}

export default function ProfileImage({
  imageUrl,
  size = 100,
  onImageSelected,
  editable = true,
}: ProfileImageProps) {
  const theme = useTheme();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={editable ? pickImage : undefined}>
        {imageUrl ? (
          <Avatar.Image size={size} source={{ uri: imageUrl }} />
        ) : (
          <Avatar.Icon
            size={size}
            icon="account"
            style={{ backgroundColor: colors.secondary }}
          />
        )}
      </Pressable>
      {editable && (
        <IconButton
          icon="pencil"
          size={16}
          iconColor={colors.white}
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={pickImage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    margin: 0,
  },
});
