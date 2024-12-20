import { ProofState } from '@credo-ts/core'
import { useAgent, useProofByState } from '@credo-ts/react-hooks'
import { ProofCustomMetadata, ProofMetadata } from '@hyperledger/aries-bifold-verifier'
import { useNavigation } from '@react-navigation/native'
import {
  CardStyleInterpolators,
  StackCardStyleInterpolator,
  StackNavigationProp,
  createStackNavigator,
} from '@react-navigation/stack'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, DeviceEventEmitter } from 'react-native'

import IconButton, { ButtonLocation } from '../components/buttons/IconButton'
import { EventTypes } from '../constants'
import { TOKENS, useServices } from '../container-api'
import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { useTheme } from '../contexts/theme'
import { useDeepLinks } from '../hooks/deep-links'
import HistoryStack from '../modules/history/navigation/HistoryStack'
import Chat from '../screens/Chat'
import { BifoldError } from '../types/error'
import { AuthenticateStackParams, Screens, Stacks, TabStacks } from '../types/navigators'
import { connectFromScanOrDeepLink } from '../utils/helpers'
import { testIdWithKey } from '../utils/testable'

import ConnectStack from './ConnectStack'
import ContactStack from './ContactStack'
import DeliveryStack from './DeliveryStack'
import NotificationStack from './NotificationStack'
import ProofRequestStack from './ProofRequestStack'
import SettingStack from './SettingStack'
import TabStack from './TabStack'
import { useDefaultStackOptions } from './defaultStackOptions'

const RootStack: React.FC = () => {
  const [store, dispatch] = useStore()
  const { agent } = useAgent()
  const appState = useRef(AppState.currentState)
  const [currentState, setCurrentState] = useState<string>(appState.current)
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthenticateStackParams>>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [
    splash,
    { enableImplicitInvitations, enableReuseConnections },
    logger,
    OnboardingStack,
    CustomNavStack1,
    loadState,
  ] = useServices([
    TOKENS.SCREEN_SPLASH,
    TOKENS.CONFIG,
    TOKENS.UTIL_LOGGER,
    TOKENS.STACK_ONBOARDING,
    TOKENS.CUSTOM_NAV_STACK_1,
    TOKENS.LOAD_STATE,
  ])

  useDeepLinks()

  // remove connection on mobile verifier proofs if proof is rejected regardless of if it has been opened
  const declinedProofs = useProofByState([ProofState.Declined, ProofState.Abandoned])
  useEffect(() => {
    declinedProofs.forEach((proof) => {
      const meta = proof?.metadata?.get(ProofMetadata.customMetadata) as ProofCustomMetadata
      if (meta?.delete_conn_after_seen) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        agent?.connections.deleteById(proof?.connectionId ?? '').catch(() => {})
        proof?.metadata.set(ProofMetadata.customMetadata, { ...meta, delete_conn_after_seen: false })
      }
    })
  }, [declinedProofs, agent, store.preferences.useDataRetention])

  useEffect(() => {
    loadState(dispatch)
      .then(() => {
        dispatch({ type: DispatchAction.STATE_LOADED })
      })
      .catch((err: unknown) => {
        const error = new BifoldError(t('Error.Title1044'), t('Error.Message1044'), (err as Error).message, 1001)
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      })
  }, [dispatch, loadState, t])

  // handle deeplink events
  useEffect(() => {
    async function handleDeepLink(deepLink: string) {
      logger.info(`Handling deeplink: ${deepLink}`)
      // If it's just the general link with no params, set link inactive and do nothing
      if (deepLink.search(/oob=|c_i=|d_m=|url=/) < 0) {
        dispatch({
          type: DispatchAction.ACTIVE_DEEP_LINK,
          payload: [undefined],
        })
        return
      }

      try {
        await connectFromScanOrDeepLink(
          deepLink,
          agent,
          logger,
          navigation,
          true, // isDeepLink
          enableImplicitInvitations,
          enableReuseConnections
        )
      } catch (err: unknown) {
        const error = new BifoldError(
          t('Error.Title1039'),
          t('Error.Message1039'),
          (err as Error)?.message ?? err,
          1039
        )
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      }

      // set deeplink as inactive
      dispatch({
        type: DispatchAction.ACTIVE_DEEP_LINK,
        payload: [undefined],
      })
    }

    if (currentState === 'background') {
      return
    }

    if (agent?.isInitialized && store.deepLink && store.authentication.didAuthenticate) {
      handleDeepLink(store.deepLink)
    }
  }, [
    dispatch,
    agent,
    logger,
    navigation,
    enableImplicitInvitations,
    enableReuseConnections,
    t,
    currentState,
    agent?.isInitialized,
    store.deepLink,
    store.authentication.didAuthenticate,
  ])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'inactive') {
        // on iOS this happens when any OS prompt is shown. We
        // don't want do anything in this case.
        return
      }

      if (appState.current === nextAppState) {
        return // no change
      }

      appState.current = nextAppState
      setCurrentState(appState.current)
    })

    return () => {
      sub.remove()
    }
  }, [])

  useEffect(() => {
    if (!agent || !agent.isInitialized) {
      return
    }

    if (currentState === 'background') {
      agent.mediationRecipient
        .stopMessagePickup()
        .then(() => {
          logger.info('Stopped agent message pickup')
        })
        .catch((err) => {
          logger.error(`Error stopping agent message pickup, ${err}`)
        })

      return
    }

    if (currentState === 'active') {
      agent.mediationRecipient
        .initiateMessagePickup()
        .then(() => {
          logger.info('Resuming agent message pickup')
        })
        .catch((err) => {
          logger.error(`Error resuming agent message pickup, ${err}`)
        })

      return
    }
  }, [agent, currentState, logger])

  const mainStack = () => {
    const Stack = createStackNavigator()

    // This function is to make the fade in behavior of both iOS and Android consistent for the settings menu
    const forFade: StackCardStyleInterpolator = ({ current }) => ({
      cardStyle: {
        opacity: current.progress,
      },
    })

    return (
      <Stack.Navigator initialRouteName={Screens.Splash} screenOptions={{ ...defaultStackOptions, headerShown: false }}>
        <Stack.Screen name={Screens.Splash} component={splash} />
        <Stack.Screen name={Stacks.TabStack} component={TabStack} />
        <Stack.Screen
          name={Screens.Chat}
          component={Chat}
          options={({ navigation }) => ({
            headerShown: true,
            title: t('Screens.CredentialOffer'),
            headerLeft: () => (
              <IconButton
                buttonLocation={ButtonLocation.Left}
                accessibilityLabel={t('Global.Back')}
                testID={testIdWithKey('BackButton')}
                onPress={() => {
                  navigation.navigate(TabStacks.HomeStack, { screen: Screens.Home })
                }}
                icon="arrow-left"
              />
            ),
          })}
        />
        <Stack.Screen name={Stacks.ConnectStack} component={ConnectStack} />
        <Stack.Screen
          name={Stacks.SettingStack}
          component={SettingStack}
          options={{
            cardStyleInterpolator: forFade,
          }}
        />
        <Stack.Screen name={Stacks.ContactStack} component={ContactStack} />
        <Stack.Screen name={Stacks.NotificationStack} component={NotificationStack} />
        <Stack.Screen
          name={Stacks.ConnectionStack}
          component={DeliveryStack}
          options={{
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name={Stacks.ProofRequestsStack} component={ProofRequestStack} />
        <Stack.Screen
          name={Stacks.HistoryStack}
          component={HistoryStack}
          options={{
            cardStyleInterpolator: forFade,
          }}
        />
        {CustomNavStack1 ? <Stack.Screen name={Stacks.CustomNavStack1} component={CustomNavStack1} /> : null}
      </Stack.Navigator>
    )
  }

  if (
    ((store.onboarding.onboardingVersion !== 0 && store.onboarding.didCompleteOnboarding) ||
      (store.onboarding.onboardingVersion === 0 && store.onboarding.didConsiderBiometry)) &&
    store.authentication.didAuthenticate &&
    store.onboarding.postAuthScreens.length === 0
  ) {
    return mainStack()
  }
  return <OnboardingStack />
}

export default RootStack
