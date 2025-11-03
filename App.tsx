import { StyleSheet, Text, View, useWindowDimensions, ImageBackground, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import flashcardsData from './data/flashcards.json';

interface Flashcard {
  id: number;
  text: string;
}

// A more lively spring configuration
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 0.8,
};

// A vibrant color palette for the cards
const VIBRANT_COLORS = [
  ['#ff7e5f', '#feb47b'], // Sunny Orange
  ['#6a11cb', '#2575fc'], // Royal Blue
  ['#00c6ff', '#0072ff'], // Sky Blue
  ['#f7971e', '#ffd200'], // Golden Yellow
  ['#f857a6', '#ff5858'], // Flamingo Pink
  ['#43e97b', '#38f9d7'], // Mint Green
  ['#8E2DE2', '#4A00E0'], // Deep Purple
  ['#ff9a9e', '#fecfef'], // Soft Pink
  ['#00b09b', '#96c93d'], // Lush Green
  ['#d4fc79', '#96e6a1'], // Lime Green
];

export default function App() {
  const [cards, setCards] = useState<Flashcard[]>(flashcardsData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const offset = useSharedValue(0);
  const rotate = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  useEffect(() => {
    offset.value = 0;
    rotate.value = 0;
    isAnimating.value = false;
  }, [currentIndex]);

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      if (isAnimating.value) return;
      offset.value = event.translationY;
      rotate.value = interpolate(event.translationY, [-screenHeight / 2, 0, screenHeight / 2], [-10, 0, 10], Extrapolate.CLAMP);
    })
    .onEnd(event => {
      if (isAnimating.value) return;
      const drag = event.translationY;
      const threshold = screenHeight * 0.2;

      if (Math.abs(drag) > threshold) {
        isAnimating.value = true;
        const direction = Math.sign(drag);
        offset.value = withSpring(direction * screenHeight, SPRING_CONFIG, () => {
          runOnJS(setCurrentIndex)((prev: number) =>
            direction > 0 ? (prev - 1 + cards.length) % cards.length : (prev + 1) % cards.length
          );
        });
      } else {
        // **FIX:** Lock gestures during the snap-back animation
        isAnimating.value = true;
        offset.value = withSpring(0, SPRING_CONFIG, () => {
          isAnimating.value = false;
        });
        rotate.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const renderCard = (card: Flashcard | undefined, index: number, style: any) => {
    if (!card) return null;
    const cardColors = VIBRANT_COLORS[card.id % VIBRANT_COLORS.length];

    return (
      <Animated.View style={[styles.cardContainer, style]}>
        <LinearGradient colors={cardColors} style={styles.gradient}>
          <Text style={styles.cardText}>{card.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  const currentCard = cards[currentIndex];
  const nextCard = cards[(currentIndex + 1) % cards.length];
  const prevCard = cards[(currentIndex - 1 + cards.length) % cards.length];

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: offset.value },
      { rotateZ: `${rotate.value}deg` },
    ],
  }));

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(offset.value, [0, -screenHeight], [screenHeight, 0], Extrapolate.CLAMP) },
      { scale: interpolate(offset.value, [0, -screenHeight], [0.9, 1], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(offset.value, [0, -screenHeight / 2], [0.8, 1], Extrapolate.CLAMP),
  }));

  const prevCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(offset.value, [0, screenHeight], [-screenHeight, 0], Extrapolate.CLAMP) },
      { scale: interpolate(offset.value, [0, screenHeight], [0.9, 1], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(offset.value, [0, screenHeight / 2], [0.8, 1], Extrapolate.CLAMP),
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=3000&auto=format&fit=crop' }}
        style={styles.container}
        blurRadius={10}
      >
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} style={styles.overlay}>
          <SafeAreaView style={styles.safeArea}>
            <Text style={styles.title}>Yogadrishti</Text>

            <View style={styles.deckContainer}>
              {renderCard(prevCard, (currentIndex - 1 + cards.length) % cards.length, prevCardStyle)}
              {renderCard(nextCard, (currentIndex + 1) % cards.length, nextCardStyle)}
              
              {currentCard && (
                <GestureDetector gesture={panGesture}>
                  {renderCard(currentCard, currentIndex, animatedCardStyle)}
                </GestureDetector>
              )}
            </View>

            <View style={styles.navigation}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)}
                disabled={cards.length <= 1}
              >
                <Text style={styles.buttonIcon}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setCurrentIndex((prev) => (prev + 1) % cards.length)}
                disabled={cards.length <= 1}
              >
                <Text style={styles.buttonIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>Swipe or use buttons to navigate</Text>
            <StatusBar style="light" />
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 30,
  },
  title: {
    fontSize: 42,
    fontFamily: 'HelveticaNeue-Light', // A more elegant font
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 4,
    marginTop: 20,
  },
  deckContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardContainer: {
    width: '85%',
    height: '75%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonIcon: {
    color: '#fff',
    fontSize: 24,
  },
  footerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    paddingBottom: 10,
  },
});