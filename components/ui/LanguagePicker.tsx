import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-remix-icon';
import { useLanguage } from '../../src/i18n/useLanguage';
import { colors } from '@/constants/colors';

const LANGUAGES = [
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
];

export function LanguagePicker() {
  const { language, changeLanguage } = useLanguage();

  return (
    <View
      style={{
        backgroundColor: 'rgba(30, 26, 100, 0.4)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        <Icon name="global-line" size={16} color="rgba(255, 255, 255, 0.5)" />
        <Text className="font-dmsans" style={{ fontSize: 14, color: '#FAFAFF', marginLeft: 12 }}>
          Langue / Language
        </Text>
      </View>

      {LANGUAGES.map((lang, index) => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => changeLanguage(lang.code)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: index < LANGUAGES.length - 1 ? 1 : 0,
            borderBottomColor: 'rgba(255, 255, 255, 0.06)',
            backgroundColor: language === lang.code ? 'rgba(82, 72, 212, 0.15)' : 'transparent',
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 18 }}>{lang.flag}</Text>
            <Text className="font-dmsans" style={{ fontSize: 14, color: '#FAFAFF' }}>
              {lang.label}
            </Text>
          </View>
          {language === lang.code && (
            <Icon name="check-line" size={16} color={colors.accent} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
