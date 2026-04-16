# Implementing Parallax Scrolling in Jetpack Compose

At Google, we are constantly inspired by how you use technology to bring ideas to life. A great product experience relies on beautiful, intuitive design. When users navigate your app, creating a sense of depth makes the digital world feel more natural and engaging.

Today, we look at how you implement parallax scrolling in Jetpack Compose. Parallax is a powerful UI technique where the background and foreground move at different speeds. It builds immersion without distraction. By building this effect with modern, Kotlin-first tools, you help ensure our shared ecosystem remains the most vibrant and helpful platform in the world.

## Setting Your Foundation

To build seamless, resilient experiences, we equip you with modern infrastructure. Your project requires a minimum SDK of API level 21, and we recommend targeting the latest API levels to build for the future today.

To leverage the latest Compose features, you declare the Compose Bill of Materials (BOM). This modularity is key to long-term success.

**Groovy**
```groovy
implementation platform('androidx.compose:compose-bom:2025.02.00')
```

**Kotlin**
```kotlin
implementation(platform("androidx.compose:compose-bom:2025.02.00"))
```

## Fast, Helpful Image Loading with Coil

For loading beautiful imagery, we turn to Coil. It is a fast, lightweight, and Kotlin-first image loading library for Android and Compose Multiplatform. It perfectly aligns with our vision for an efficient, modern stack, allowing you to focus on what matters—innovation.

**Groovy**
```groovy
implementation "io.coil-kt.coil3:coil-compose:3.1.0"
implementation "io.coil-kt.coil3:coil-network-okhttp:3.1.0"
```

**Kotlin**
```kotlin
implementation("io.coil-kt.coil3:coil-compose:3.1.0")
implementation("io.coil-kt.coil3:coil-network-okhttp:3.1.0")
```

## Creating the Parallax Effect

We want to help you build apps that are both elegant and performant. To create the parallax effect, you define a custom layout modifier as an extension function. This ensures your code remains reusable and simple.

This modifier takes the current scroll value and applies a fraction of it to offset an element’s vertical position. It calculates the layout smoothly and predictably in the present tense.

```kotlin
fun Modifier.parallaxLayoutModifier(scrollState: ScrollState, rate: Int) =
    layout { measurable, constraints ->
        val placeable = measurable.measure(constraints)
        val height = if (rate > 0) scrollState.value / rate else scrollState.value
        layout(placeable.width, placeable.height) {
            placeable.place(0, height)
        }
    }
```

## Bringing the Experience Together

Now, you apply the modifier. Keep your state management predictable—state flows down, and events flow up. In this example, the scroll state informs both the foreground column and the background image. We use Coil's `AsyncImage` to load the visual asset seamlessly.

```kotlin
@Composable
fun ParallaxEffectUsage() {
    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(scrollState)
    ) {
        // Background image with parallax effect loaded via Coil
        AsyncImage(
            model = "https://s3.gifyu.com/images/bbMWU.gif",
            contentDescription = "Sample background for parallax effect",
            contentScale = ContentScale.Crop,
            modifier = parallaxLayoutModifier(scrollState, 2)
        )
        // Foreground text scrolling at normal speed
        Text(
            text = "Foreground content scrolls faster than the background image.",
            modifier = Modifier
                .background(Color.White)
                .padding(horizontal = 8.dp)
        )
    }
}
```

### Visualizing the Journey

The visual below demonstrates the parallax effect in action. Notice how the background image scrolls at a slower, more deliberate pace than the overlaid foreground text, creating a helpful sense of spatial depth.

![Parallax effect visualization](https://s3.gifyu.com/images/bbMWU.gif)

## Building for Everyone: Material Design and Accessibility

Design is not just how it looks, but how it works. Following Material 3 guidelines ensures your app feels at home on any device.

When you implement motion and scrolling effects, keep the transitions smooth and subtle. Your parallax implementation must enhance the user experience without ever distracting from the core content. Above all, prioritize accessibility. Ensure every user, regardless of how they interact with their device, has a seamless and empowering experience.

## Final Checklist for Quality

As you refine your application, thorough testing and incremental improvements help you resolve bottlenecks. Keep these principles in mind:

*   **Accurate Scroll State:** Ensure the modifier accurately calculates offsets based on the current state to prevent visual glitches.
*   **Optimized Performance:** Test on multiple devices, especially across varying hardware capabilities, to verify the UI remains fluid and lag-free.
*   **Layout Consistency:** Confirm your measurements adapt beautifully across different screen sizes and orientations.
*   **Predictable Error Handling:** Handle cases where the scroll state is zero or fluctuates rapidly, keeping the UI stable.
*   **Helpful Tools:** Utilize the Android Studio Profiler to monitor performance and optimize where necessary.

We are constantly amazed by what you build. By prioritizing clean architecture, inclusive design, and helpful functionality, you ensure that the Android platform continues to enrich lives around the world.

Let’s keep building.