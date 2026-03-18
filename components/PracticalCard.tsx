/**
 * PracticalCard - Display practical information (visa, currency, language, etc.)
 * Glassmorphism design matching the new budget cards
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-remix-icon';

const getCurrencyIcon = (currency: string | null | undefined): string | null => {
  if (!currency) return null;
  const normalized = currency.toLowerCase().replace(/[^\w]/g, '');
  
  const iconMap: Record<string, string> = {
    euro: 'money-euro-circle-fill',
    eur: 'money-euro-circle-fill',
    dollars: 'money-dollar-circle-fill',
    dollar: 'money-dollar-circle-fill',
    usd: 'money-dollar-circle-fill',
    gbp: 'money-pound-circle-fill',
    pounds: 'money-pound-circle-fill',
    pound: 'money-pound-circle-fill',
    cny: 'money-cny-circle-fill',
    yuan: 'money-cny-circle-fill',
    renminbi: 'money-cny-circle-fill',
    inr: 'money-rupee-circle-fill',
    rupees: 'money-rupee-circle-fill',
    rupee: 'money-rupee-circle-fill',
    jpy: 'money-yen-circle-fill',
    yen: 'money-yen-circle-fill',
    krw: 'money-won-circle-fill',
    won: 'money-won-circle-fill',
    chf: 'money-franc-circle-fill',
    franc: 'money-franc-circle-fill',
    francs: 'money-franc-circle-fill',
    aud: 'money-dollar-circle-fill',
    cad: 'money-dollar-circle-fill',
    sek: 'money-krone-circle-fill',
    krone: 'money-krone-circle-fill',
    kroner: 'money-krone-circle-fill',
    nok: 'money-krone-circle-fill',
    dkk: 'money-krone-circle-fill',
    rub: 'money-ruble-circle-fill',
    rouble: 'money-ruble-circle-fill',
    ruble: 'money-ruble-circle-fill',
    mxn: 'money-peso-circle-fill',
    peso: 'money-peso-circle-fill',
    pesos: 'money-peso-circle-fill',
    brl: 'money-real-circle-fill',
    real: 'money-real-circle-fill',
    thb: 'money-baht-circle-fill',
    baht: 'money-baht-circle-fill',
    vnd: 'money-dong-circle-fill',
    dong: 'money-dong-circle-fill',
    idr: 'money-rupiah-circle-fill',
    rupiah: 'money-rupiah-circle-fill',
    myr: 'money-ringgit-circle-fill',
    ringgit: 'money-ringgit-circle-fill',
    sgd: 'money-dollar-circle-fill',
    hkd: 'money-dollar-circle-fill',
    twd: 'money-dollar-circle-fill',
    pln: 'money-zloty-circle-fill',
    zloty: 'money-zloty-circle-fill',
    czk: 'money-koruna-circle-fill',
    koruna: 'money-koruna-circle-fill',
    huf: 'money-forint-circle-fill',
    forint: 'money-forint-circle-fill',
    try: 'money-lira-circle-fill',
    lira: 'money-lira-circle-fill',
    ils: 'money-shekel-circle-fill',
    shekel: 'money-shekel-circle-fill',
    aed: 'money-dirham-circle-fill',
    dirham: 'money-dirham-circle-fill',
    sar: 'money-riyal-circle-fill',
    rial: 'money-riyal-circle-fill',
  };
  
  return iconMap[normalized] || null;
};

interface PracticalInfo {
  visa_required?: boolean | null;
  local_currency?: string | null;
  language?: string | null;
  best_apps?: string[] | null;
  what_to_pack?: string[] | null;
  safety_tips?: string[] | null;
  avoid?: string[] | null;
}

interface PracticalCardProps {
  info: PracticalInfo;
}

export function PracticalCard({ info }: PracticalCardProps) {
  const { t } = useTranslation();
  const hasEssential = info.visa_required !== undefined || info.local_currency || info.language;
  const hasApps = info.best_apps && info.best_apps.length > 0;
  const hasToPack = info.what_to_pack && info.what_to_pack.length > 0;
  const hasSafetyTips = info.safety_tips && info.safety_tips.length > 0;
  const hasAvoid = info.avoid && info.avoid.length > 0;

  return (
    <View style={styles.container}>
      {/* Essential Info - Blue accent */}
      {hasEssential && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Icon name="shield-check-line" size={16} color="#60a5fa" />
            </View>
            <Text style={styles.cardTitle}>{t('practicalInfo.essentialInfo')}</Text>
          </View>
          <View style={styles.cardContent}>
            {info.visa_required !== undefined && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('practicalInfo.visa')}</Text>
                <View style={[styles.rowValue, info.visa_required && styles.rowValueWarning]}>
                  <Icon name={"error-warning-fill"} size={14} color={info.visa_required ? '#fb923c' : '#34d399'} />
                  <Text style={[styles.rowValueText, info.visa_required && styles.rowValueTextWarning]}>
                    {info.visa_required ? t('practicalInfo.required') : t('practicalInfo.notRequired')}
                  </Text>
                </View>
              </View>
            )}
            {info.local_currency && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('practicalInfo.currency')}</Text>
                <View style={styles.currencyValue}>
                  {getCurrencyIcon(info.local_currency) !== null && (
                    <Icon 
                      name={getCurrencyIcon(info.local_currency)! as any}
                      size={14} 
                      color="#60a5fa" 
                    />
                  )}
                  <Text style={styles.rowValueText}>{info.local_currency}</Text>
                </View>
              </View>
            )}
            {info.language && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('practicalInfo.language')}</Text>
                <View style={styles.rowValue}>
                  <Icon name={"global-fill"} size={14} color="#c084fc" />
                  <Text style={styles.rowValueText}>{info.language}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Apps - Blue accent */}
      {hasApps && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Icon name="smartphone-line" size={16} color="#60a5fa" />
            </View>
            <Text style={styles.cardTitle}>{t('practicalInfo.usefulApps')}</Text>
          </View>
          <View style={styles.tagsContainer}>
            {info.best_apps!.map((app, idx) => (
              <View key={idx} style={styles.tag}>
                <Icon name="wifi-line" size={10} color="#60a5fa" />
                <Text style={styles.tagText}>{app}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* What to pack - Purple accent */}
      {hasToPack && (
        <View style={[styles.card, { borderColor: 'rgba(168, 85, 247, 0.25)' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Icon name="suitcase-line" size={16} color="#a855f7" />
            </View>
            <Text style={styles.cardTitle}>{t('practicalInfo.toBring')}</Text>
          </View>
          <View style={styles.tagsContainer}>
            {info.what_to_pack!.map((item, idx) => (
              <View key={idx} style={[styles.tag, styles.tagPurple]}>
                <Text style={styles.tagText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Safety tips - Green/Yellow accent */}
      {hasSafetyTips && (
        <View style={[styles.card, { borderColor: 'rgba(234, 179, 8, 0.25)' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Icon name="lightbulb-line" size={16} color="#eab308" />
            </View>
            <Text style={styles.cardTitle}>{t('practicalInfo.safetyTips')}</Text>
          </View>
          <View style={styles.listContainer}>
            {info.safety_tips!.map((tip, idx) => (
              <View key={idx} style={styles.listRow}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Things to avoid - Red accent */}
      {hasAvoid && (
        <View style={[styles.card, { borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Icon name="alert-line" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.cardTitle, { color: 'rgba(255, 255, 255, 0.7)' }]}>{t('practicalInfo.toAvoid')}</Text>
          </View>
          <View style={styles.listContainer}>
            {info.avoid!.map((item, idx) => (
              <View key={idx} style={styles.listRow}>
                <Text style={styles.listBulletRed}>✗</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(30, 26, 100, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  cardContent: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValueWarning: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rowValueText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  rowValueTextWarning: {
    color: '#fb923c',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagPurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  tagText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  listContainer: {
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
  },
  listBullet: {
    fontSize: 14,
    color: '#eab308',
  },
  listBulletRed: {
    fontSize: 12,
    color: '#ef4444',
  },
  listText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
    lineHeight: 20,
  },
});
