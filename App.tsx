import { StyleSheet, Text, View, useWindowDimensions, ImageBackground, TouchableOpacity } from 'react-native';
// App.tsx
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate } from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Import the flashcard data directly
import flashcardsData from './data/flashcards.json';

// Define the structure of a flashcard
interface Flashcard {
  id: number;
  text: string;
}

// A constant for animation configuration
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 100,
  mass: 0.5,
};

export default function App() {
  const [cards, setCards] = useState<Flashcard[]>(flashcardsData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { height: screenHeight } = useWindowDimensions();

  // offset controls the movement of the current card (0 = centered)
  const offset = useSharedValue(0);
  const rotate = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  // Reset positions when the card changes
  useEffect(() => {
    // Reset shared animation values when index changes
    offset.value = 0;
    rotate.value = 0;
    // allow new animations after the index change
    isAnimating.value = false;
  }, [currentIndex]);

  const currentCard = cards[currentIndex];
  // Show previous card for animation (optional, not rendered)
  const prevCard = cards[(currentIndex - 1 + cards.length) % cards.length];
  const nextCard = cards[(currentIndex + 1) % cards.length];

  // Gesture handler for swiping
  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      // Ignore gestures while animating
      if (isAnimating.value) return;
      offset.value = event.translationY;
      // small tilt while dragging
      rotate.value = interpolate(event.translationY, [-screenHeight / 2, 0, screenHeight / 2], [-8, 0, 8], Extrapolate.CLAMP);
    })
    .onEnd(event => {
      if (isAnimating.value) return;
      const drag = event.translationY;
      const abs = Math.abs(drag);
      const threshold = Math.max(60, screenHeight * 0.18);
      if (abs > threshold) {
        isAnimating.value = true;
        const direction = Math.sign(drag);
        // animate the offset off-screen in the drag direction
        offset.value = withSpring(direction * screenHeight, SPRING_CONFIG, () => {
          // after animation completes on UI thread, update JS index
          runOnJS(setCurrentIndex)((prev: number) =>
            direction > 0 ? (prev - 1 + cards.length) % cards.length : (prev + 1) % cards.length
          );
        });
      } else {
        // snap back
        offset.value = withSpring(0, SPRING_CONFIG);
        rotate.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Animated styles for the cards
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: offset.value },
      { rotateZ: `${rotate.value}deg` },
    ],
  }));

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      // Next card comes from below: move from screenHeight -> 0 as offset goes 0 -> -screenHeight
      { translateY: offset.value + screenHeight },
      { scale: interpolate(offset.value, [-screenHeight, 0, screenHeight], [1, 0.95, 1], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(offset.value, [-screenHeight / 2, 0, screenHeight / 2], [1, 0.9, 1], Extrapolate.CLAMP),
  }));

  const prevCardStyle = useAnimatedStyle(() => ({
    transform: [
      // Prev card comes from above: move from -screenHeight -> 0 as offset goes 0 -> screenHeight
      { translateY: offset.value - screenHeight },
      { scale: interpolate(offset.value, [-screenHeight, 0, screenHeight], [1, 0.95, 1], Extrapolate.CLAMP) },
    ],
    opacity: interpolate(offset.value, [-screenHeight / 2, 0, screenHeight / 2], [1, 0.9, 1], Extrapolate.CLAMP),
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=3000&auto=format&fit=crop' }}
        style={styles.container}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        >
          <SafeAreaView style={styles.safeArea}>
            <Text style={styles.title}>Yogadrishti</Text>

            <View style={styles.deckContainer}>
              {/* Render previous card above, next card below, and current on top */}
              {prevCard && (
                <Animated.View style={[styles.cardContainer, styles.prevCard, prevCardStyle]}>
                  <View style={styles.glassmorphism}>
                    <Text style={styles.cardText}>{prevCard.text}</Text>
                  </View>
                </Animated.View>
              )}

              {nextCard && (
                <Animated.View style={[styles.cardContainer, styles.nextCard, nextCardStyle]}>
                  <View style={styles.glassmorphism}>
                    <Text style={styles.cardText}>{nextCard.text}</Text>
                  </View>
                </Animated.View>
              )}

              {currentCard && (
                <GestureDetector gesture={panGesture}>
                  <Animated.View style={[styles.cardContainer, animatedCardStyle]}>
                    <View style={styles.glassmorphism}>
                      <Text style={styles.cardText}>{currentCard.text}</Text>
                    </View>
                  </Animated.View>
                </GestureDetector>
              )}
            </View>

            {/* Navigation buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 16 }}>
              <TouchableOpacity
                style={{ padding: 12, marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }}
                onPress={() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)}
                disabled={cards.length <= 1}
              >
                <Text style={{ color: '#fff', fontSize: 18 }}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 12, marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }}
                onPress={() => setCurrentIndex((prev) => (prev + 1) % cards.length)}
                disabled={cards.length <= 1}
              >
                <Text style={{ color: '#fff', fontSize: 18 }}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Swipe up/down or use buttons</Text>
            </View>
            <StatusBar style="light" />
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}

// Stylesheet for all components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
  },
  deckContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardContainer: {
    width: '90%',
    height: '80%', // taller card
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  glassmorphism: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(30, 30, 30, 0.95)', // Nearly opaque dark background for readability
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  cardText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
  },
  nextCard: {
    // Styling to keep the next card in the background
  },
  prevCard: {
    // Styling to keep the previous card in the background
  },
  footer: {
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});