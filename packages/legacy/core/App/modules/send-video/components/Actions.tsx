import React from 'react'
import { StyleSheet, View } from 'react-native'

import Text from '../../../components/texts/Text'
import Title from '../../../components/texts/Title'
import { Prompt } from '../types/api'
import { useTheme } from '../../../contexts/theme'

const Actions: React.FC<{ prompts: Prompt[] }> = ({ prompts }) => {
  const { TextTheme } = useTheme()

  const styles = StyleSheet.create({
    instruction: {
      ...TextTheme.bold,
      textAlign: 'left',
      width: '100%',
      paddingLeft: 10,
    },

    instructionItem: {
      alignItems: 'center',
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      marginVertical: 15,
    },
  })

  return (
    <>
      {prompts?.map((instruction, index) => (
        <View key={instruction.id} style={styles.instructionItem}>
          <Title style={TextTheme.bold}>{index + 1}.</Title>
          <Text style={styles.instruction}>{instruction.text}</Text>
        </View>
      ))}
    </>
  )
}

export default Actions
