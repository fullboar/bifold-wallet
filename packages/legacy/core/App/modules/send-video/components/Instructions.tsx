import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../../contexts/theme'

import Text from '../../../components/texts/Text'

const Instructions: React.FC = () => {
  const { t } = useTranslation()
  const { TextTheme } = useTheme()

  const styles = StyleSheet.create({
    instructionContainer: {
      marginVertical: 15,
      paddingLeft: 5,
    },
    instructionItemText: {
      ...TextTheme.normal,
      lineHeight: 32,
    },
  })

  return (
    <View style={styles.instructionContainer}>
      <Text style={styles.instructionItemText}>{t('SendVideo.Instructions.BeTheOnlyPersonInTheVideo')}</Text>
      <Text style={styles.instructionItemText}>{t('SendVideo.Instructions.BeInQuitePlace')}</Text>
      <Text style={styles.instructionItemText}>{t('SendVideo.Instructions.HoldTheDeviceInFrontOfYourFace')}</Text>
      <Text style={styles.instructionItemText}>{t('SendVideo.Instructions.CheckYourFaceCanBeeSeenInTheVideo')}</Text>
      <Text style={styles.instructionItemText}>{t('SendVideo.Instructions.SeeYourFirstAndLastName')}</Text>
    </View>
  )
}

export default Instructions
