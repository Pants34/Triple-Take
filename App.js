import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Button,
  Modal,
  StyleSheet
} from 'react-native';
import { Audio } from 'expo-av';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ---------- GLOBAL STATE ----------
let nextReviewId = 1;
let nextRequestId = 1;

const reviews = {
  action: [],
  comedy: [],
  scifi: []
};

const viewerRequests = [];
const ownerRequests = viewerRequests;

// OWNER MODE ENABLED
const isOwner = true;

// ---------- LANGUAGE STRINGS ----------
const STRINGS = {
  en: {
    action: 'Action',
    comedy: 'Comedy',
    scifi: 'Sci-Fi',
    createReview: 'Create Review',
    movieTitle: 'Movie Title',
    textReviewLabel: 'Text Review',
    audioReviewLabel: 'Audio Review',
    saveReview: 'Save Review',
    ownerProfile: 'Owner Profile',
    priorityPriceLabel: 'Priority Review Price ($)',
    cashTagLabel: 'CashTag (for payments)',
    noReviews: 'No reviews yet.',
    allRequests: 'All Viewer Requests',
    noRequests: 'No requests yet.',
    saveChanges: 'Save Changes',
    makeRequest: 'Make a Request',
    whyWant: 'Why do you want this review?',
    genre: 'Genre',
    submitRequest: 'Submit Request',
    makePriorityRequest: 'Make Priority Request',
    yourRequests: 'Your Requests',
    youNoRequests: 'You have no requests.',
    priority: 'PRIORITY',
    priorityInfo:
      'Priority requests cost $PRICE. Pay the owner at $CASHTAG, then tap "I Paid".',
    iPaid: 'I Paid',
    startRecording: 'Start Recording',
    stopRecording: 'Stop Recording'
  }
};

function genreTitle(key, strings) {
  return key === 'action'
    ? strings.action
    : key === 'comedy'
    ? strings.comedy
    : strings.scifi;
}

function labelForMode(mode) {
  return mode === 'text'
    ? 'Text'
    : mode === 'audio'
    ? 'Audio'
    : 'Both';
}

// ---------- GENRE LIST SCREEN ----------
function GenreList({ navigation, themeColor, strings, genre }) {
  const list = reviews[genre];

  return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      <Text style={[styles.title, { color: themeColor }]}>
        {genreTitle(genre, strings)}
      </Text>

      <ScrollView style={{ marginTop: 20 }}>
        {list.length === 0 && (
          <Text style={[styles.empty, { color: themeColor }]}>
            {strings.noReviews}
          </Text>
        )}

        {list.map(r => (
          <Pressable
            key={r.id}
            onPress={() =>
              navigation.navigate('FullReview', { review: r, genre })
            }
          >
            <View style={[styles.card, { borderColor: themeColor }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: themeColor }]}>
                  {r.title}
                </Text>
                <Text style={[styles.cardMode, { color: themeColor }]}>
                  {labelForMode(r.mode)}
                </Text>
              </View>

              {(r.mode === 'text' || r.mode === 'both') && (
                <Text style={[styles.cardPreview, { color: themeColor }]}>
                  {r.textReview.slice(0, 80)}...
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ marginTop: 20 }}>
        <Button
          title={strings.createReview}
          onPress={() => navigation.navigate('CreateReview', { genre })}
          color="#f5c518"
        />
      </View>
    </View>
  );
}

// ---------- FULL REVIEW SCREEN ----------
function FullReviewScreen({ route, themeColor, strings }) {
  const { review } = route.params;

  const playAudio = async () => {
    if (!review.audioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: review.audioUri });
    await sound.playAsync();
  };

  return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      <Text style={[styles.title, { color: themeColor }]}>{review.title}</Text>

      {(review.mode === 'text' || review.mode === 'both') && (
        <Text style={[styles.full, { color: themeColor }]}>
          {review.textReview}
        </Text>
      )}

      {(review.mode === 'audio' || review.mode === 'both') && (
        <View style={{ marginTop: 20 }}>
          <Button
            title="Play Audio Review"
            onPress={playAudio}
            color="#f5c518"
          />
        </View>
      )}
    </View>
  );
}

// ---------- CREATE REVIEW SCREEN ----------
function CreateReviewScreen({ route, navigation, themeColor, strings }) {
  const { genre } = route.params;

  const [title, setTitle] = React.useState('');
  const [mode, setMode] = React.useState('text');
  const [textReview, setTextReview] = React.useState('');
  const [recording, setRecording] = React.useState(null);
  const [audioUri, setAudioUri] = React.useState(null);
  const [isRecording, setIsRecording] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert('Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.log('Error starting recording:', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setIsRecording(false);
      setRecording(null);
    } catch (err) {
      console.log('Error stopping recording:', err);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a movie title.');
      return;
    }

    if ((mode === 'text' || mode === 'both') && !textReview.trim()) {
      alert('Please enter a text review.');
      return;
    }

    if ((mode === 'audio' || mode === 'both') && !audioUri) {
      alert('Please record audio.');
      return;
    }

    const newReview = {
      id: nextReviewId++,
      title: title.trim(),
      mode,
      textReview:
        mode === 'text' || mode === 'both' ? textReview.trim() : null,
      audioUri: mode === 'audio' || mode === 'both' ? audioUri : null
    };

    reviews[genre].push(newReview);
    navigation.goBack();
  };return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      <Text style={[styles.title, { color: themeColor }]}>
        {strings.createReview} ({genreTitle(genre, strings)})
      </Text>

      <Text style={[styles.subtitle, { color: themeColor }]}>
        {strings.movieTitle}
      </Text>
      <TextInput
        style={[styles.input, { color: themeColor }]}
        placeholder="Enter movie title..."
        placeholderTextColor="#777"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={[styles.subtitle, { color: themeColor }]}>Review Type</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setMode('text')}>
          <Text
            style={[
              styles.modeChip,
              {
                borderColor: mode === 'text' ? themeColor : '#555',
                color: mode === 'text' ? themeColor : '#fff'
              }
            ]}
          >
            Text
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode('audio')}>
          <Text
            style={[
              styles.modeChip,
              {
                borderColor: mode === 'audio' ? themeColor : '#555',
                color: mode === 'audio' ? themeColor : '#fff'
              }
            ]}
          >
            Audio
          </Text>
        </Pressable>

        <Pressable onPress={() => setMode('both')}>
          <Text
            style={[
              styles.modeChip,
              {
                borderColor: mode === 'both' ? themeColor : '#555',
                color: mode === 'both' ? themeColor : '#fff'
              }
            ]}
          >
            Both
          </Text>
        </Pressable>
      </View>

      {(mode === 'text' || mode === 'both') && (
        <>
          <Text style={[styles.subtitle, { color: themeColor }]}>
            {strings.textReviewLabel}
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 100, color: themeColor }]}
            multiline
            placeholder="Write your review..."
            placeholderTextColor="#777"
            value={textReview}
            onChangeText={setTextReview}
          />
        </>
      )}

      {(mode === 'audio' || mode === 'both') && (
        <>
          <Text style={[styles.subtitle, { color: themeColor }]}>
            {strings.audioReviewLabel}
          </Text>
          <Text style={[styles.fullSmall, { color: themeColor }]}>
            Tap record to capture your audio review. Tap stop when finished.
          </Text>

          <View style={styles.row}>
            {!isRecording ? (
              <Pressable style={styles.audioButton} onPress={startRecording}>
                <Text style={styles.audioButtonText}>
                  {strings.startRecording}
                </Text>
              </Pressable>
            ) : (
              <Pressable style={styles.audioButtonStop} onPress={stopRecording}>
                <Text style={styles.audioButtonText}>
                  {strings.stopRecording}
                </Text>
              </Pressable>
            )}
          </View>

          {audioUri && (
            <Text style={[styles.fullSmall, { color: themeColor }]}>
              Audio recorded and ready to save.
            </Text>
          )}
        </>
      )}

      <View style={{ marginTop: 24 }}>
        <Button
          title={strings.saveReview}
          onPress={handleSave}
          color="#f5c518"
        />
      </View>
    </View>
  );
}

// ---------- PROFILE SCREEN (OWNER MODE) ----------
function ProfileScreen({
  themeColor,
  language,
  strings,
  cashTag,
  setCashTag,
  priorityPrice,
  setPriorityPrice
}) {
  const [_, forceUpdate] = React.useReducer(x => x + 1, 0);

  const [editingReview, setEditingReview] = React.useState(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editMode, setEditMode] = React.useState('text');
  const [editTextReview, setEditTextReview] = React.useState('');
  const [editRecording, setEditRecording] = React.useState(null);
  const [editAudioUri, setEditAudioUri] = React.useState(null);
  const [editIsRecording, setEditIsRecording] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (editRecording) {
        editRecording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [editRecording]);

  const handleDelete = reviewId => {
    for (const key of Object.keys(reviews)) {
      const idx = reviews[key].findIndex(r => r.id === reviewId);
      if (idx !== -1) {
        reviews[key].splice(idx, 1);
        break;
      }
    }
    if (editingReview && editingReview.id === reviewId) {
      setEditingReview(null);
    }
    forceUpdate();
  };

  const handleStartEdit = review => {
    setEditingReview(review);
    setEditTitle(review.title);
    setEditMode(review.mode);
    setEditTextReview(review.textReview || '');
    setEditAudioUri(review.audioUri || null);
    setEditIsRecording(false);
    setEditRecording(null);
  };

  const startEditRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert('Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setEditRecording(recording);
      setEditIsRecording(true);
    } catch (err) {
      console.log('Error starting edit recording:', err);
    }
  };

  const stopEditRecording = async () => {
    try {
      if (!editRecording) return;
      await editRecording.stopAndUnloadAsync();
      const uri = editRecording.getURI();
      setEditAudioUri(uri);
      setEditIsRecording(false);
      setEditRecording(null);
    } catch (err) {
      console.log('Error stopping edit recording:', err);
    }
  };

  const handleSaveEdit = () => {
    if (!editingReview) return;

    if (!editTitle.trim()) {
      alert('Please enter a movie title.');
      return;
    }

    if ((editMode === 'text' || editMode === 'both') && !editTextReview.trim()) {
      alert('Please enter a text review.');
      return;
    }

    if ((editMode === 'audio' || editMode === 'both') && !editAudioUri) {
      alert('Please record audio.');
      return;
    }

    editingReview.title = editTitle.trim();
    editingReview.mode = editMode;
    editingReview.textReview =
      editMode === 'text' || editMode === 'both'
        ? editTextReview.trim()
        : null;
    editingReview.audioUri =
      editMode === 'audio' || editMode === 'both' ? editAudioUri : null;

    setEditingReview(null);
    forceUpdate();
  };

  const handlePriorityPriceChange = value => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setPriorityPrice(num);
    }
  };

  const handleCashTagChange = value => {
    setCashTag(value);
  };

  return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      <Text style={[styles.title, { color: themeColor }]}>
        {strings.ownerProfile}
      </Text>

      <Text style={[styles.subtitle, { color: themeColor }]}>
        {strings.priorityPriceLabel}
      </Text>
      <TextInput
        style={[styles.input, { color: themeColor }]}
        keyboardType="numeric"
        value={String(priorityPrice)}
        onChangeText={handlePriorityPriceChange}
      />

      <Text style={[styles.subtitle, { color: themeColor, marginTop: 12 }]}>
        {strings.cashTagLabel}
      </Text>
      <TextInput
        style={[styles.input, { color: themeColor }]}
        value={cashTag}
        onChangeText={handleCashTagChange}
      />

      <Text style={[styles.subtitle, { color: themeColor, marginTop: 20 }]}>
        Your Reviews
      </Text>

      <ScrollView style={{ marginTop: 10, maxHeight: 220 }}>
        {Object.entries(reviews).every(([_, list]) => list.length === 0) && (
          <Text style={[styles.empty, { color: themeColor }]}>
            {strings.noReviews}
          </Text>
        )}

        {Object.entries(reviews).map(([genre, list]) =>
          list.map(r => (
            <View key={r.id} style={styles.rowBetween}>
              <Text style={[styles.item, { color: themeColor }]}>
                [{genreTitle(genre, strings)}] {r.title} ({labelForMode(r.mode)})
              </Text>

              <View style={{ flexDirection: 'row' }}>
                <Pressable onPress={() => handleStartEdit(r)}>
                  <Text style={styles.edit}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(r.id)}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
{editingReview && (
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionHeader, { color: themeColor }]}>
            Edit Review
          </Text>

          <Text style={[styles.subtitle, { color: themeColor }]}>
            {strings.movieTitle}
          </Text>
          <TextInput
            style={[styles.input, { color: themeColor }]}
            value={editTitle}
            onChangeText={setEditTitle}
          />

          <Text style={[styles.subtitle, { color: themeColor }]}>
            Review Type
          </Text>
          <View style={styles.row}>
            <Pressable onPress={() => setEditMode('text')}>
              <Text
                style={[
                  styles.modeChip,
                  {
                    borderColor: editMode === 'text' ? themeColor : '#555',
                    color: editMode === 'text' ? themeColor : '#fff'
                  }
                ]}
              >
                Text
              </Text>
            </Pressable>

            <Pressable onPress={() => setEditMode('audio')}>
              <Text
                style={[
                  styles.mode
                  // ---------- NAVIGATION SETUP ----------
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function GenreStack({ themeColor, strings }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: themeColor
      }}
    >
      <Stack.Screen
        name="GenreList"
        options={{ title: 'Reviews' }}
      >
        {props => (
          <GenreList
            {...props}
            themeColor={themeColor}
            strings={strings}
            genre={props.route.params.genre}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="FullReview" options={{ title: 'Full Review' }}>
        {props => (
          <FullReviewScreen
            {...props}
            themeColor={themeColor}
            strings={strings}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CreateReview" options={{ title: 'Create Review' }}>
        {props => (
          <CreateReviewScreen
            {...
